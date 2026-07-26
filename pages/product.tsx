"use client"

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useAuth } from '@clerk/nextjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';

class NonRetryableStreamError extends Error {}

export default function Product() {
    const { getToken } = useAuth();
    const [idea, setIdea] = useState<string>('…loading');

    useEffect(() => {
        let buffer = '';
        const abortController = new AbortController();

        (async () => {
            try {
                const jwt = await getToken();
                if (!jwt) {
                    setIdea('Authentication required');
                    return;
                }

                await fetchEventSource('/api', {
                    signal: abortController.signal,
                    headers: { Authorization: `Bearer ${jwt}` },
                    async onopen(response) {
                        const contentType = response.headers.get('content-type') ?? '';

                        if (!response.ok) {
                            const message = response.status === 403
                                ? 'Authentication failed. Please sign out and sign back in.'
                                : `Request failed with status ${response.status}.`;

                            setIdea(message);
                            throw new NonRetryableStreamError(message);
                        }

                        if (!contentType.includes('text/event-stream')) {
                            setIdea('The API returned an unexpected response format.');
                            throw new NonRetryableStreamError('Unexpected content type');
                        }
                    },
                    onmessage(ev) {
                        if (ev.event === 'error') {
                            throw new NonRetryableStreamError(ev.data || 'Streaming failed');
                        }

                        buffer += ev.data;
                        setIdea(buffer);
                    },
                    onerror(err) {
                        if (err instanceof NonRetryableStreamError) {
                            throw err;
                        }

                        setIdea('The live stream was interrupted. Please refresh and try again.');
                        throw new NonRetryableStreamError('Stream interrupted');
                    }
                });
            } catch (error) {
                if (!(error instanceof NonRetryableStreamError)) {
                    setIdea('Unable to load the business idea right now.');
                    console.error(error);
                }
            }
        })();

        return () => {
            abortController.abort();
        };
    }, []); // Empty dependency array - run once on mount

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Business Idea Generator
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        AI-powered innovation at your fingertips
                    </p>
                </header>

                {/* Content Card */}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-95">
                        {idea === '…loading' ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-pulse text-gray-400">
                                    Generating your business idea...
                                </div>
                            </div>
                        ) : (
                            <div className="markdown-content text-gray-700 dark:text-gray-300">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                >
                                    {idea}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}