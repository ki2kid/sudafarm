from ninja import NinjaAPI
from accounts.api import router as accounts_router

api = NinjaAPI()


@api.get("/health")
def health(request):
    return {"status": "ok"}


api.add_router("/auth", accounts_router)