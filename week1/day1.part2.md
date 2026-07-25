# INSTANT GRATIFICATION - Part 2

## Adding AI to Your Production App

Now let's enhance your live production app with OpenAI's API to create dynamic, AI-generated content.

## Step 1: Get Your OpenAI API Key

If you don't already have an OpenAI API key, follow these steps:

1. Visit [platform.openai.com](https://platform.openai.com) and sign up for a new account

2. Add credits to your account:
   - Go to [https://platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview)
   - Add your $5 minimum payment
   - **Important:** Ensure "Auto Recharge" is NOT enabled

3. Create your API key:
   - Visit [https://platform.openai.com/settings/organization/api-keys](https://platform.openai.com/settings/organization/api-keys)
   - Click "Create new secret key"
   - Your key will start with `sk-proj-...`
   - Copy it to your clipboard
   - **Save it somewhere safe** (use a plain text editor, not a word processor like Word that might format the characters)

## Step 2: Add Your API Key to Vercel

In your Cursor terminal, type:

```bash
vercel env add OPENAI_API_KEY
```

- When prompted for the value, paste your API key from the clipboard
- Select all environments (development, preview, production) when asked

## Step 3: Update Dependencies

Open your `requirements.txt` file and add the OpenAI library:

```
fastapi
uvicorn
openai
```

Save the file.

## Step 4: Update Your Application Code

Replace the entire content of `instant.py` with:

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from openai import OpenAI

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def instant():
    client = OpenAI()
    message = """
You are on a website that has just been deployed to production for the first time!
Please reply with an enthusiastic announcement to welcome visitors to the site, explaining that it is live on production for the first time!
"""
    messages = [{"role": "user", "content": message}]
    response = client.chat.completions.create(model="gpt-5-nano", messages=messages)
    reply = response.choices[0].message.content.replace("\n", "<br/>")
    html = f"<html><head><title>Live in an Instant!</title></head><body><p>{reply}</p></body></html>"
    return html
```

Save the file.

## Step 5: Deploy Your AI-Enhanced App

Deploy to development first to test:

```bash
vercel .
```

Once it's deployed:
1. Visit the URL provided
2. You should see a dynamic, AI-generated welcome message!
3. Refresh the page to see different variations

Deploy to production when ready:

```bash
vercel --prod
```

## What's Happening? >

Your app now:
- Connects to OpenAI's API using your secure API key
- Generates unique, enthusiastic welcome messages for each visitor
- Returns properly formatted HTML with the AI's response
- Runs entirely serverless on Vercel's infrastructure

## Congratulations! <�

You've successfully:
-  Integrated AI into a production application
-  Secured API credentials using environment variables
-  Created dynamic, personalized content
-  Built your first AI-powered web application

## What You've Learned:
- How to securely manage API keys in production
- How to integrate OpenAI's API with FastAPI
- How to use environment variables in Vercel
- How to create dynamic HTML responses with AI-generated content

## Next Steps:
- Try modifying the prompt to create different types of content
- Add query parameters to customize the AI's response
- Experiment with different OpenAI models
- Add error handling for API failures

## Troubleshooting

### "OpenAI API key not found"
- Make sure you added the environment variable with `vercel env add`
- Check that the key name is exactly `OPENAI_API_KEY`
- Redeploy after adding the environment variable

### "Insufficient credits"
- Check your OpenAI account balance at platform.openai.com
- Ensure you've added the $5 minimum payment

### Page loads slowly
- The first request may be slower as the serverless function cold starts
- Subsequent requests should be faster
- This is normal behavior for serverless functions

## Security Note =
Your API key is:
- Never exposed in your code
- Securely stored in Vercel's environment variables
- Only accessible to your deployed application
- Protected from being visible in browser developer tools