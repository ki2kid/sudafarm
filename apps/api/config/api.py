from ninja import NinjaAPI
from accounts.api import router as accounts_router
from locations.api import router as locations_router
from listings.api import router as listings_router

api = NinjaAPI()


@api.get("/health")
def health(request):
    return {"status": "ok"}


api.add_router("/auth", accounts_router)
api.add_router("", locations_router)
api.add_router("/listings", listings_router)
