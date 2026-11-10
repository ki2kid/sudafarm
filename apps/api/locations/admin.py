from django.contrib import admin

from .models import Department, Hospital, Locality, Neighborhood, State


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("code", "name_ar", "name_en")
    search_fields = ("code", "name_ar", "name_en")


@admin.register(Locality)
class LocalityAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_en", "state")
    list_filter = ("state",)
    search_fields = ("name_ar", "name_en")


@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_en", "locality")
    list_filter = ("locality__state", "locality")
    search_fields = ("name_ar", "name_en")


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 0


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ("code", "name_ar", "type", "license_number", "is_active", "contract_start", "contract_end")
    list_filter = ("type", "is_active")
    search_fields = ("code", "name_ar", "name_en", "license_number")
    inlines = (DepartmentInline,)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_en", "hospital", "floor")
    list_filter = ("hospital",)
    search_fields = ("name_ar", "name_en")
