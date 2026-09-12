from pydantic import BaseModel
from typing import List

class Symptom(BaseModel):
    id: str
    name: str

class RedFlag(BaseModel):
    code: str
    keywords: List[str]
    severity: str
    message: str
