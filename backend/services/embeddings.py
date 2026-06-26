import json
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger("embeddings")
_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from fastembed import TextEmbedding
        import os
        cache = os.getenv("EMBEDDINGS_CACHE_DIR", "/app/data/models")
        os.makedirs(cache, exist_ok=True)
        _model = TextEmbedding("BAAI/bge-small-en-v1.5", cache_dir=cache)
        logger.info("Embedding model ready (BAAI/bge-small-en-v1.5, ONNX)")
    except Exception as e:
        logger.error(f"Embedding model load failed: {e}")
    return _model


def embed(text: str) -> Optional[list]:
    model = _load_model()
    if model is None:
        return None
    try:
        vecs = list(model.embed([text[:8000]]))
        return vecs[0].tolist()
    except Exception as e:
        logger.error(f"embed() failed: {e}")
        return None


def cosine_similarity(a: list, b: list) -> float:
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 1.0
    return float(np.dot(va, vb) / (na * nb))


def semantic_distance(a: list, b: list) -> float:
    return 1.0 - cosine_similarity(a, b)


def embedding_to_json(vec: list) -> str:
    return json.dumps(vec)


def embedding_from_json(s: str) -> Optional[list]:
    try:
        return json.loads(s)
    except Exception:
        return None
