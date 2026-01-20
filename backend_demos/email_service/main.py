
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
import logging

# --- Microservice Extraction: Email Service ---
# Extracted from Monolith logic into standalone FastAPI service

app = FastAPI(title="Email Microservice")

# Configure Logging (Loguru replacement as requested)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailRequest(BaseModel):
    recipient: EmailStr
    subject: str
    body: str

@app.post("/send-email")
async def send_email(email_req: EmailRequest):
    """
    Sends an email using SMTP.
    Independent service, scalable separately.
    """
    try:
        msg = MIMEText(email_req.body)
        msg['Subject'] = email_req.subject
        msg['From'] = "noreply@beyondstat.com"
        msg['To'] = email_req.recipient

        # SMTP Configuration (Mock)
        smtp_server = "smtp.example.com"
        smtp_port = 587
        
        # In production, use aiosmtplib for async
        # with smtplib.SMTP(smtp_server, smtp_port) as server:
        #     server.starttls()
        #     server.login("user", "pass")
        #     server.send_message(msg)

        logger.info(f"Email sent to {email_req.recipient} with subject '{email_req.subject}'")
        return {"status": "sent", "recipient": email_req.recipient}

    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail="Email delivery failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
