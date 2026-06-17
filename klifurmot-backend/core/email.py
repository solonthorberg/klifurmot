import asyncio
from venv import logger
import httpx

from klifurmot import settings


def send_email_via_resend(to: str, subject: str, body: str) -> None:

    async def _send() -> None:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.DEFAULT_FROM_EMAIL,
                    "to": [to],
                    "subject": subject,
                    "text": body,
                },
                timeout=10,
            )
            if response.status_code not in (200, 201):
                logger.error(
                    f"Resend API error: {response.status_code} {response.text}"
                )
                raise Exception(f"Failed to send email: {response.status_code}")

    asyncio.run(_send())
