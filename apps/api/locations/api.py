from ninja import Router, Schema

from .models import Locality, Neighborhood, State

router = Router()


class StateOut(Schema):
    id: int
    name_ar: str
    name_en: str
    code: str


class LocalityOut(Schema):
    id: int
    state_id: int
    name_ar: str
    name_en: str


class NeighborhoodOut(Schema):
    id: int
    locality_id: int
    name_ar: str
    name_en: str


@router.get("/locations/states", response=list[StateOut])
def list_states(request):
    return State.objects.all()


@router.get("/locations/localities", response=list[LocalityOut])
def list_localities(request, state_id: int | None = None):
    queryset = Locality.objects.all()
    if state_id is not None:
        queryset = queryset.filter(state_id=state_id)
    return queryset


@router.get("/locations/neighborhoods", response=list[NeighborhoodOut])
def list_neighborhoods(request, locality_id: int | None = None):
    queryset = Neighborhood.objects.all()
    if locality_id is not None:
        queryset = queryset.filter(locality_id=locality_id)
    return queryset
