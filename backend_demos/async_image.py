import asyncio
import time
import logging

# --- Async Refactoring Demo ---
# Scenario: Converting a blocking image processing function to non-blocking async.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Original Blocking Function (Simulated)
def process_image_blocking(image_id: str):
    logger.info(f"Starting blocking processing for {image_id}")
    time.sleep(2) # Simulates heavy I/O or CPU work
    logger.info(f"Finished blocking processing for {image_id}")
    return f"processed_{image_id}.jpg"

# Refactored Async Function
async def process_image(image_id: str):
    """
    Simulates async image processing.
    In real world: await run_in_executor for CPU bound, or await io_call for I/O.
    """
    logger.info(f"[Async] Starting processing for {image_id}")
    
    # Simulate non-blocking I/O (e.g., uploading to S3, waiting for external API)
    await asyncio.sleep(2) 
    
    logger.info(f"[Async] Finished processing for {image_id}")
    return f"processed_{image_id}.jpg"

async def main():
    # Process multiple images concurrently
    image_ids = ["img1", "img2", "img3", "img4", "img5"]
    
    logger.info("--- Starting Batch Processing ---")
    start_time = time.time()
    
    # Create tasks
    tasks = [process_image(img_id) for img_id in image_ids]
    
    # Run concurrently
    results = await asyncio.gather(*tasks)
    
    duration = time.time() - start_time
    logger.info(f"--- Finished Batch in {duration:.2f} seconds ---")
    logger.info(f"Results: {results}")

if __name__ == "__main__":
    asyncio.run(main())
