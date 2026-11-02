import json
import struct

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
MIN_SIZE = 28


def validate_glb(data: bytes) -> dict:
    if len(data) < MIN_SIZE:
        raise ValueError("The file is too small to be a GLB model")
    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != GLB_MAGIC:
        raise ValueError("The file is not a binary glTF (.glb) model")
    if version != 2:
        raise ValueError("Only glTF version 2 is supported")
    if length != len(data):
        raise ValueError("The GLB header length does not match the file size")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != JSON_CHUNK:
        raise ValueError("The first GLB chunk must be JSON")
    if 20 + chunk_length > len(data):
        raise ValueError("The GLB JSON chunk is truncated")
    try:
        document = json.loads(data[20 : 20 + chunk_length].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("The GLB JSON chunk is not valid") from error
    if not isinstance(document, dict) or "asset" not in document:
        raise ValueError("The GLB file has no asset description")
    if not document.get("meshes"):
        raise ValueError("The GLB file contains no meshes")
    for key in ("buffers", "images"):
        for entry in document.get(key, []):
            uri = entry.get("uri") if isinstance(entry, dict) else None
            if uri is not None and not str(uri).startswith("data:"):
                raise ValueError("External resources are not allowed inside the model")
    return document

