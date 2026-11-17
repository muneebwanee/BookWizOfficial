<div align="center">

# A model, when you want one

**Your connection. Your approval. Your words.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

BookWiz works as a writing room without an API key. Optional connections add planning, drafting, revision, critique, or cover images through a provider you choose.

## Connect in the studio

1. Open **AI & model hub** and choose a provider.
2. Follow its official dashboard link, create a key, and check account access and pricing.
3. Add the connection name, exact model ID, endpoint, and key.
4. Approve the short connection test, then select that connection for the task.

Keys remain in memory by default. An optional vault passphrase enables encrypted persistence on the device. The passphrase is not stored. Provider consumer subscriptions and API credit are separate products.

## Connection choices

| Type | Examples |
| :--- | :--- |
| **Text APIs** | OpenAI, Gemini, Anthropic, Groq, OpenRouter, Mistral, Together, DeepSeek, Perplexity, xAI, Hugging Face, and Cerebras. |
| **Local API services** | Ollama, LM Studio, and compatible OpenAI-style endpoints. |
| **Device model** | Apple Intelligence on compatible iPhone/iPad devices with iOS/iPadOS 26 or later and the model available. |
| **Cover images** | OpenAI, Stability, fal.ai, and Together image APIs. |
| **Studio narration** | Optional OpenAI speech through an existing connection, after separate text-sharing approval. |

Model IDs, quotas, and regional access change. The provider cards link to official documentation. A free tier is a provider policy rather than a BookWiz promise.

## Automatic local discovery

Opening the model hub checks the known loopback API addresses for Ollama, LM Studio and llama.cpp. Detected models appear with a **Use model** button; their actual model ID and address are filled in automatically. Metadata discovery never submits a prompt or manuscript. A running API server is required; a model file or a standalone chat app without an API is not a served model.

The installed iPhone/iPad app checks Apple Intelligence availability without generating text. Desktop editions inspect local model servers through their host, and the compiler’s local studio reads model lists through its own origin. These two editions also route approved local chat requests on the device, so runtime CORS settings do not block those requests. A browser can still require local-network permission or runtime CORS configuration.

## Local services and browsers

For Ollama, load a model and allow the exact BookWiz origin through `OLLAMA_ORIGINS`. For LM Studio, load a model, start its API server, and use the displayed ID and endpoint. Keep local services on loopback unless deliberately configuring a trusted network.

Browser CORS restrictions belong to the service's configuration. A request header cannot bypass them. BookWiz includes no shared secret-key proxy. A local service's network access does not change the requirement to approve a model action.

The confirmation before a request describes its destination and context. The [privacy policy](../PRIVACY.md) explains retained data, speech, references, and approved batches.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
