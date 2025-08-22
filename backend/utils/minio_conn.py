import os
import re
from minio import Minio, S3Error

from utils.app_logger import createLogger

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")

# minio_client = Minio(
#     MINIO_ENDPOINT,
#     access_key=MINIO_ACCESS_KEY,
#     secret_key=MINIO_SECRET_KEY,
#     secure=False  # Set to True if using HTTPS
# )

logger = createLogger('app')

class MinIOService:
    def __init__(self, endpoint=MINIO_ENDPOINT,
                 access_key=MINIO_ACCESS_KEY,
                 secret_key=MINIO_SECRET_KEY):
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False,
            region="us-east-1"
        )

    def sanitize_bucket_name(self, name):
        """
        MinIO bucket naming rules:
        - 3-63 characters
        - lowercase letters, numbers, hyphens
        - must start/end with letter or number
        """
        # Convert to lowercase and replace invalid chars
        sanitized = re.sub(r'[^a-z0-9-]', '-', name.lower())

        # Remove leading/trailing hyphens
        sanitized = sanitized.strip('-')

        # Ensure it starts with alphanumeric
        if not sanitized[0].isalnum():
            sanitized = 'user-' + sanitized

        # Ensure length is between 3-63
        if len(sanitized) < 3:
            sanitized = sanitized + '-bucket'
        elif len(sanitized) > 63:
            sanitized = sanitized[:59] + '-bkt'

        return sanitized

    def create_user_bucket(self, phone_number):
        """Create bucket from phone number"""
        # Sanitize phone number for bucket name
        bucket_name = f"user-{phone_number}"

        try:
            # Check if bucket exists
            if not self.client.bucket_exists(bucket_name):
                # Create bucket
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")

                # Set default policy (optional - makes bucket readable)
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "*"},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                        }
                    ]
                }
                # Uncomment if you want public read access
                # self.client.set_bucket_policy(bucket_name, json.dumps(policy))

            return bucket_name

        except S3Error as e:
            logger.error(f"Error creating bucket {bucket_name}: {e}")
            raise Exception(f"Failed to create bucket: {str(e)}")

    def get_or_create_bucket(self, identifier, bucket_type="user"):
        """Generic method to get or create bucket"""
        bucket_name = self.sanitize_bucket_name(f"{bucket_type}-{identifier}")

        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")

            return bucket_name

        except S3Error as e:
            logger.error(f"Error with bucket {bucket_name}: {e}")
            # Fall back to default bucket
            return "shared"

    def list_user_buckets(self, prefix="user-"):
        """List all user buckets"""
        try:
            buckets = self.client.list_buckets()
            user_buckets = [b.name for b in buckets if b.name.startswith(prefix)]
            return user_buckets
        except S3Error as e:
            logger.error(f"Error listing buckets: {e}")
            return []