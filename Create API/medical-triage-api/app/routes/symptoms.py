from fastapi import APIRouter, Query
from typing import List, Optional
from app.services.symptom_normalizer import normalizer
from app.schemas.symptom import Symptom

router = APIRouter()

@router.get("/triage/symptoms", response_model=List[Symptom], tags=["Symptoms"])
def get_symptoms(search: Optional[str] = Query(None, description="Search term for symptoms")):
    symptoms_list = normalizer.symptoms
    if search:
        search_lower = search.lower()
        filtered = [
            s for s in symptoms_list 
            if search_lower in s["name"].lower() or search_lower in s["id"].lower()
        ]
        return filtered
    return symptoms_list
