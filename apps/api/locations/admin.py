from django.contrib import admin

from .models import Locality, Neighborhood, State


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
