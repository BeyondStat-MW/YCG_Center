import sys
from loguru import logger
import json

# --- Structured Logging Demo (Loguru) ---

# Configure Loguru to write JSON logs for production (e.g., Datadog/Splunk ingestion)
logger.remove() # Remove default handler
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="INFO"
)
# Add JSON sink for structured logging
# logger.add("app.json", serialize=True) 

def process_transaction(user_id, amount):
    logger.info(f"Processing transaction for user_id={user_id}, amount={amount}")
    
    if amount < 0:
        # Structured error context
        logger.error("Invalid transaction amount", user_id=user_id, amount=amount, status="failed")
        return False
    
    try:
        # Business logic...
        new_balance = 100 + amount
        logger.success("Transaction completed", user_id=user_id, new_balance=new_balance, status="success")
        return True
    except Exception as e:
        logger.exception("Unexpected error during transaction")
        return False

if __name__ == "__main__":
    logger.info("Server starting...")
    process_transaction("user_123", 50.0)
    process_transaction("user_456", -10.0)
    logger.warning("High memory usage detected", memory_percent=85)
