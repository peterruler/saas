import os
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel  # type: ignore
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials  # type: ignore
from openai import OpenAI  # type: ignore


PREEXISTING_ENV_KEYS = set(os.environ)


def load_local_env() -> None:
    root_dir = Path(__file__).resolve().parent.parent

    for env_name, allow_override in ((".env", False), (".env.local", True)):
        env_path = root_dir / env_name
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if allow_override:
                if key in PREEXISTING_ENV_KEYS and os.environ.get(key):
                    continue
                os.environ[key] = value
                continue

            os.environ.setdefault(key, value)


load_local_env()

app = FastAPI()
jwks_url = os.getenv("CLERK_JWKS_URL")
if not jwks_url:
    raise RuntimeError("Missing CLERK_JWKS_URL. Set it in the environment or define it in .env/.env.local.")

clerk_config = ClerkConfig(jwks_url=jwks_url)
clerk_guard = ClerkHTTPBearer(clerk_config)


class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str


system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply with exactly three sections with the headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
"""


def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""


@app.post("/api")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]  # Available for tracking/auditing

    if not os.getenv("OPENAI_API_KEY") and not os.getenv("OPENAI_ADMIN_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is missing. Set it in .env or .env.local before generating a summary.",
        )

    client = OpenAI()

    user_prompt = user_prompt_for(visit)

    prompt = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    stream = client.chat.completions.create(
        model="gpt-5-nano",
        messages=prompt,
        stream=True,
    )

    def event_stream():
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                lines = text.split("\n")
                for line in lines[:-1]:
                    yield f"data: {line}\n\n"
                    yield "data:  \n"
                yield f"data: {lines[-1]}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
