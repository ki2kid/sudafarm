from datetime import date
from decimal import Decimal
from functools import wraps
from typing import Callable, TypeVar

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.middleware.csrf import get_token
from django.utils.translation import gettext_lazy as _
from ninja import Router, Schema
from ninja.utils import check_csrf

from .models import Department, Hospital, Locality, Neighborhood, State

router = Router()
T = TypeVar("T")


class MessageOut(Schema):
    detail: str


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


class DepartmentIn(Schema):
    hospital_id: int
    name_ar: str
    name_en: str
    floor: int


class DepartmentOut(DepartmentIn):
    id: int


class HospitalIn(Schema):
    name_ar: str
    name_en: str
    code: str
    type: Hospital.HospitalType
    license_number: str
    phone: str
    email: str
    address_line: str
    neighborhood_id: int | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_active: bool = True
    contract_start: date
    contract_end: date | None = None


class HospitalOut(HospitalIn):
    id: int
    neighborhood_name_ar: str | None = None

    @staticmethod
    def resolve_neighborhood_name_ar(obj: Hospital) -> str | None:
        return obj.neighborhood.name_ar if obj.neighborhood else None


def csrf_protected(view: Callable[..., T]) -> Callable[..., T]:
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        failure = check_csrf(request, view)
        if failure is not None:
            return failure
        return view(request, *args, **kwargs)

    return wrapped


def require_superuser(request):
    if not request.user.is_authenticated or not request.user.is_superuser:
        return 403, {"detail": str(_("Only superusers can manage hospitals and departments."))}
    return None


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


@router.get(
    "/hospitals",
    response={200: list[HospitalOut], 403: MessageOut},
)
def list_hospitals(request):
    failure = require_superuser(request)
    if failure:
        return failure
    return Hospital.objects.select_related("neighborhood").all()


@router.post(
    "/hospitals",
    response={201: HospitalOut, 400: MessageOut, 403: MessageOut},
)
@csrf_protected
def create_hospital(request, payload: HospitalIn):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        hospital = Hospital(
            **payload.dict(exclude={"neighborhood_id"}),
            neighborhood_id=payload.neighborhood_id,
        )
        hospital.full_clean()
        hospital.save()
    except (IntegrityError, ValidationError) as error:
        return 400, {"detail": str(error)}
    return 201, hospital


@router.put(
    "/hospitals/{hospital_id}",
    response={200: HospitalOut, 400: MessageOut, 403: MessageOut, 404: MessageOut},
)
@csrf_protected
def update_hospital(request, hospital_id: int, payload: HospitalIn):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        hospital = Hospital.objects.get(pk=hospital_id)
    except Hospital.DoesNotExist:
        return 404, {"detail": str(_("Hospital not found."))}
    for field, value in payload.dict().items():
        setattr(hospital, field, value)
    hospital.full_clean()
    hospital.save()
    return hospital


@router.delete(
    "/hospitals/{hospital_id}",
    response={200: MessageOut, 403: MessageOut, 404: MessageOut},
)
@csrf_protected
def delete_hospital(request, hospital_id: int):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        hospital = Hospital.objects.get(pk=hospital_id)
    except Hospital.DoesNotExist:
        return 404, {"detail": str(_("Hospital not found."))}
    hospital.delete()
    return {"detail": str(_("Hospital deleted."))}


@router.get(
    "/departments",
    response={200: list[DepartmentOut], 403: MessageOut},
)
def list_departments(request, hospital_id: int | None = None):
    failure = require_superuser(request)
    if failure:
        return failure
    queryset = Department.objects.all()
    if hospital_id is not None:
        queryset = queryset.filter(hospital_id=hospital_id)
    return queryset


@router.post(
    "/departments",
    response={201: DepartmentOut, 400: MessageOut, 403: MessageOut},
)
@csrf_protected
def create_department(request, payload: DepartmentIn):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        department = Department(**payload.dict())
        department.full_clean()
        department.save()
    except (IntegrityError, ValidationError) as error:
        return 400, {"detail": str(error)}
    return 201, department


@router.put(
    "/departments/{department_id}",
    response={200: DepartmentOut, 400: MessageOut, 403: MessageOut, 404: MessageOut},
)
@csrf_protected
def update_department(request, department_id: int, payload: DepartmentIn):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        department = Department.objects.get(pk=department_id)
    except Department.DoesNotExist:
        return 404, {"detail": str(_("Department not found."))}
    for field, value in payload.dict().items():
        setattr(department, field, value)
    department.full_clean()
    department.save()
    return department


@router.delete(
    "/departments/{department_id}",
    response={200: MessageOut, 403: MessageOut, 404: MessageOut},
)
@csrf_protected
def delete_department(request, department_id: int):
    failure = require_superuser(request)
    if failure:
        return failure
    try:
        department = Department.objects.get(pk=department_id)
    except Department.DoesNotExist:
        return 404, {"detail": str(_("Department not found."))}
    department.delete()
    return {"detail": str(_("Department deleted."))}
