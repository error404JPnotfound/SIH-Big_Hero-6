from pydantic import BaseModel, Field
from typing import List, Optional

class TriageRequest(BaseModel):
    symptoms: List[str] = Field(..., min_length=1, description="List of patient symptoms")
    severity: int = Field(..., ge=1, le=10, description="Patient reported severity from 1 to 10")
    duration_days: int = Field(..., ge=0, description="Duration of symptoms in days")
    age: Optional[int] = Field(None, ge=0, description="Patient age")
    sex: Optional[str] = Field(None, description="Patient sex")
    pregnant: Optional[bool] = Field(False, description="Is patient pregnant")

class TriageResponse(BaseModel):
    triage_level: str
    emergency: bool
    matched_red_flags: List[str]
    reasons: List[str]
    recommended_action: str
    facility_action: Optional[str] = None
    next_step: Optional[str] = None
    disclaimer: str = "This triage result is informational and is not a medical diagnosis."

class ErrorResponse(BaseModel):
    code: str
    message: str
