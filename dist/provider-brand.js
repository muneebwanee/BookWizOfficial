// Provider artwork is bundled with the app so the model hub works offline.
// Asset provenance and trademark notices: assets/providers/SOURCES.json.
const marks=Object.freeze(['apple-device','gemini','openai','anthropic','groq','openrouter','mistral','together','deepseek','perplexity','xai','huggingface','cerebras','ollama','lmstudio','custom','stability','fal']);
export const providerMarks=marks;
export function providerMark(id){
 const name=marks.includes(id)?id:'custom';
 // The adjacent provider name supplies the accessible label. Avoid repeating it.
 return `<span class="provider-mark provider-brand" aria-hidden="true"><img src="assets/providers/${name}.svg" width="28" height="28" alt="" decoding="async" draggable="false"></span>`;
}
