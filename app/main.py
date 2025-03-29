from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from fastapi.responses import FileResponse
from app.routes.interview_routes import router
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="AI Interview Coach", max_request_size=5 * 1024 * 1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(router)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("app/static/images/favicon.ico")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)