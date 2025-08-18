import os
import json
from typing import Dict, Any, Optional

import redis


class RedisInstance:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not isinstance(cls._instance, cls):
            cls.__instance = super(RedisInstance, cls).__new__(cls)
            db = redis.StrictRedis(
                host=os.getenv("REDIS_HOST"),
                port=os.getenv("REDIS_PORT"),
                decode_responses=True
            )
            cls._instance = db
        return cls._instance



class RedisHelper:
    def __init__(self):
        self.redis = RedisInstance()

    def set(self, key, value, expire=None):
        """Set a key-value pair with optional expiration."""
        return self.redis.set(key, value, ex=expire)

    def get(self, key):
        """Retrieve a value from Redis."""
        return self.redis.get(key)

    def delete(self, key):
        """Delete a key."""
        return self.redis.delete(key)

    def exists(self, key):
        """Check if a key exists."""
        return self.redis.exists(key)

    def set_with_ttl(self, key, value, ttl_seconds):
        """Set a key with expiration (TTL)."""
        return self.redis.setex(key, ttl_seconds, value)

    def increment(self, key, amount=1):
        """Increment key's value."""
        return self.redis.incr(key, amount)

    def decrement(self, key, amount=1):
        """Decrement key's value."""
        return self.redis.decr(key, amount)

    def flush_all(self):
        """Flush all Redis keys (dangerous)."""
        return self.redis.flushall()

    def set_json(self, key: str, value: Dict[Any, Any], expire: Optional[int] = None):
        """Set a JSON object with optional expiration."""
        json_value = json.dumps(value, default=str)  # default=str handles datetime
        return self.redis.set(key, json_value, ex=expire)

    def get_json(self, key: str) -> Optional[Dict[Any, Any]]:
        """Retrieve and parse JSON object."""
        value = self.redis.get(key)
        if value:
            return json.loads(value)
        return None

    def set_hash(self, key: str, mapping: Dict[str, Any], expire: Optional[int] = None):
        """Set multiple hash fields at once."""
        # Convert all values to strings (Redis requirement)
        string_mapping = {k: str(v) for k, v in mapping.items()}
        result = self.redis.hset(key, mapping=string_mapping)
        if expire:
            self.redis.expire(key, expire)
        return result

    def get_hash_all(self, key: str) -> Dict[str, str]:
        """Get all hash fields."""
        return self.redis.hgetall(key)

    def get_hash_field(self, key: str, field: str) -> Optional[str]:
        """Get specific hash field."""
        return self.redis.hget(key, field)