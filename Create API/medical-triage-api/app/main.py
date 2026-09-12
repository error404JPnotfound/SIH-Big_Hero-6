from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, symptoms, triage

app = FastAPI(
    title="CareConnect Triage API",
    description="Rule-Based Triage Severity API for CareConnect",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler for validation errors to match the requested format
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(exc)
            }
        },
    )

app.include_router(health.router, prefix="/api/v1")
app.include_router(symptoms.router, prefix="/api/v1")
app.include_router(triage.router, prefix="/api/v1")
