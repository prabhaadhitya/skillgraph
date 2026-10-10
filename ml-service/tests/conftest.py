import os
import pytest

# Ensure a test secret key is set for test runs if not present in environment
if not os.getenv("INTERNAL_KEY") and not os.getenv("ML_INTERNAL_KEY"):
    os.environ["INTERNAL_KEY"] = "test-internal-key-for-pytest-12345"
