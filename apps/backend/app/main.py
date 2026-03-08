from fastapi import FastAPI

app = FastAPI(title="Sidequest API")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
