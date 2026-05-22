import httpx
import google.generativeai as genai
from app.config import settings

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        if self.provider == "gemini":
            if not settings.GEMINI_API_KEY:
                print("WARNING: GEMINI_API_KEY not set. Falling back to ollama.")
                self.provider = "ollama"
            else:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_text(self, prompt: str) -> str:
        """Generate text using the configured LLM provider"""
        try:
            if self.provider == "gemini":
                return await self._generate_gemini(prompt)
            else:
                return await self._generate_ollama(prompt)
        except Exception as e:
            print(f"LLM Error ({self.provider}): {e}")
            return "Unable to generate custom response at this time. Please follow the standard syllabus."

    async def _generate_gemini(self, prompt: str) -> str:
        # Use synchronous generate_content in a thread pool, or if async is supported
        response = await self.model.generate_content_async(prompt)
        return response.text

    async def _generate_ollama(self, prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

llm_service = LLMService()
