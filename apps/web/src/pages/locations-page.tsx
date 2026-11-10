import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"

type State = { id: number; name_ar: string; name_en: string; code: string }
type Locality = { id: number; state_id: number; name_ar: string; name_en: string }
type Neighborhood = { id: number; locality_id: number; name_ar: string; name_en: string }
type Hospital = {
  id: number
  name_ar: string
  name_en: string
  code: string
  type: string
  license_number: string
  phone: string
  email: string
  address_line: string
  neighborhood_id: number | null
  neighborhood_name_ar: string | null
  is_active: boolean
  contract_start: string
  contract_end: string | null
}
type Department = { id: number; hospital_id: number; name_ar: string; name_en: string; floor: number }
type ApiError = { detail?: string }

const initialHospital = {
  name_ar: "",
  name_en: "",
  code: "",
  type: "government",
  license_number: "",
  phone: "",
  email: "",
  address_line: "",
  state_id: "",
  locality_id: "",
  neighborhood_id: "",
  contract_start: "",
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(body.detail ?? "تعذر تنفيذ الطلب.")
  }
  return (await response.json()) as T
}

async function csrfToken() {
  return request<{ token: string }>("/api/auth/csrf")
}

export function LocationsPage() {
  const { user } = useAuth()
  const [states, setStates] = useState<State[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [hospitalForm, setHospitalForm] = useState(initialHospital)
  const [departmentForm, setDepartmentForm] = useState({ hospital_id: "", name_ar: "", name_en: "", floor: "1" })
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      request<State[]>("/api/locations/states"),
      request<Locality[]>("/api/locations/localities"),
      request<Neighborhood[]>("/api/locations/neighborhoods"),
      user?.is_superuser ? request<Hospital[]>("/api/hospitals") : Promise.resolve([] as Hospital[]),
      user?.is_superuser ? request<Department[]>("/api/departments") : Promise.resolve([] as Department[]),
    ])
      .then(([nextStates, nextLocalities, nextNeighborhoods, nextHospitals, nextDepartments]) => {
        setStates(nextStates)
        setLocalities(nextLocalities)
        setNeighborhoods(nextNeighborhoods)
        setHospitals(nextHospitals)
        setDepartments(nextDepartments)
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات."))
      .finally(() => setLoading(false))
  }, [user?.is_superuser])

  const selectedStateId = hospitalForm.state_id ? Number(hospitalForm.state_id) : null
  const selectedLocalityId = hospitalForm.locality_id ? Number(hospitalForm.locality_id) : null
  const filteredLocalities = selectedStateId
    ? localities.filter((locality) => locality.state_id === selectedStateId)
    : []
  const filteredNeighborhoods = selectedLocalityId
    ? neighborhoods.filter((neighborhood) => neighborhood.locality_id === selectedLocalityId)
    : []

  async function createHospital(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    try {
      const csrf = await csrfToken()
      const hospitalPayload = {
        name_ar: hospitalForm.name_ar,
        name_en: hospitalForm.name_en,
        code: hospitalForm.code,
        type: hospitalForm.type,
        license_number: hospitalForm.license_number,
        phone: hospitalForm.phone,
        email: hospitalForm.email,
        address_line: hospitalForm.address_line,
        neighborhood_id: hospitalForm.neighborhood_id ? Number(hospitalForm.neighborhood_id) : null,
        contract_start: hospitalForm.contract_start,
      }
      const hospital = await request<Hospital>("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.token },
        body: JSON.stringify({
          ...hospitalPayload,
          contract_end: null,
          latitude: null,
          longitude: null,
          is_active: true,
        }),
      })
      setHospitals((current) => [...current, hospital])
      setHospitalForm(initialHospital)
      setNotice("تمت إضافة المستشفى.")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "تعذر إضافة المستشفى.")
    }
  }

  async function createDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    try {
      const csrf = await csrfToken()
      const department = await request<Department>("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.token },
        body: JSON.stringify({ ...departmentForm, hospital_id: Number(departmentForm.hospital_id), floor: Number(departmentForm.floor) }),
      })
      setDepartments((current) => [...current, department])
      setDepartmentForm({ hospital_id: "", name_ar: "", name_en: "", floor: "1" })
      setNotice("تمت إضافة القسم.")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "تعذر إضافة القسم.")
    }
  }

  async function deleteResource(resource: "hospitals" | "departments", id: number) {
    const resourceLabel = resource === "hospitals" ? "المستشفى" : "القسم"
    if (!window.confirm(`هل أنت متأكد من حذف هذا ${resourceLabel}؟`)) {
      return
    }
    setError("")
    setNotice("")
    try {
      const csrf = await csrfToken()
      await request(`/api/${resource}/${id}`, { method: "DELETE", headers: { "X-CSRFToken": csrf.token } })
      if (resource === "hospitals") {
        setHospitals((current) => current.filter((hospital) => hospital.id !== id))
        setDepartments((current) => current.filter((department) => department.hospital_id !== id))
      } else {
        setDepartments((current) => current.filter((department) => department.id !== id))
      }
      setNotice("تم الحذف بنجاح.")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر الحذف.")
    }
  }

  if (!user?.is_superuser) {
    return (
      <div className="bg-muted/30 min-h-svh" dir="rtl">
        <Navbar />
        <main id="main-content" className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl items-center justify-center p-6">
          <Card className="w-full max-w-lg"><CardContent className="pt-6">هذه الصفحة متاحة للمشرفين فقط.</CardContent></Card>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">المواقع والمنشآت</h1>
          <p className="text-muted-foreground text-sm">إدارة المواقع الجغرافية والمستشفيات والأقسام.</p>
        </header>
        {loading && <p role="status">جار تحميل البيانات…</p>}
        {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
        {notice && <p className="text-primary text-sm" role="status">{notice}</p>}

        <Card>
          <CardHeader><CardTitle>التقسيمات الجغرافية</CardTitle><CardDescription>البيانات المرجعية المستخدمة لعناوين المنشآت.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="font-medium">{states.length}</p><p className="text-muted-foreground text-sm">المناطق</p></div>
            <div><p className="font-medium">{localities.length}</p><p className="text-muted-foreground text-sm">المحليات</p></div>
            <div><p className="font-medium">{neighborhoods.length}</p><p className="text-muted-foreground text-sm">الأحياء</p></div>
            <div><p className="font-medium">{hospitals.length}</p><p className="text-muted-foreground text-sm">المستشفيات</p></div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>إضافة مستشفى</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={createHospital}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="hospital-name-ar">الاسم بالعربية</Label><Input id="hospital-name-ar" name="name_ar" required value={hospitalForm.name_ar} onChange={(event) => setHospitalForm({ ...hospitalForm, name_ar: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="hospital-name-en">الاسم بالإنجليزية</Label><Input id="hospital-name-en" name="name_en" required value={hospitalForm.name_en} onChange={(event) => setHospitalForm({ ...hospitalForm, name_en: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="hospital-code">الرمز (3 أرقام)</Label><Input id="hospital-code" name="code" inputMode="numeric" maxLength={3} required spellCheck={false} value={hospitalForm.code} onChange={(event) => setHospitalForm({ ...hospitalForm, code: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="hospital-license">رقم الترخيص</Label><Input id="hospital-license" name="license_number" required spellCheck={false} value={hospitalForm.license_number} onChange={(event) => setHospitalForm({ ...hospitalForm, license_number: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="hospital-phone">الهاتف</Label><Input id="hospital-phone" name="phone" type="tel" required value={hospitalForm.phone} onChange={(event) => setHospitalForm({ ...hospitalForm, phone: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="hospital-email">البريد الإلكتروني</Label><Input id="hospital-email" name="email" type="email" required spellCheck={false} value={hospitalForm.email} onChange={(event) => setHospitalForm({ ...hospitalForm, email: event.target.value })} /></div>
                  <div className="grid gap-2"><Label>النوع</Label><Select value={hospitalForm.type} onValueChange={(value) => setHospitalForm({ ...hospitalForm, type: value ?? "government" })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="government">حكومي</SelectItem><SelectItem value="private">خاص</SelectItem><SelectItem value="charity">خيري</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></div>
                  <div className="grid gap-2"><Label>الولاية</Label><Select value={hospitalForm.state_id} onValueChange={(value) => setHospitalForm({ ...hospitalForm, state_id: value ?? "", locality_id: "", neighborhood_id: "" })}><SelectTrigger className="w-full"><SelectValue placeholder="اختر الولاية">{states.find((state) => String(state.id) === hospitalForm.state_id)?.name_ar}</SelectValue></SelectTrigger><SelectContent>{states.map((state) => <SelectItem key={state.id} value={String(state.id)}>{state.name_ar}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label>المحلية</Label><Select value={hospitalForm.locality_id} disabled={!selectedStateId} onValueChange={(value) => setHospitalForm({ ...hospitalForm, locality_id: value ?? "", neighborhood_id: "" })}><SelectTrigger className="w-full"><SelectValue placeholder="اختر المحلية">{filteredLocalities.find((locality) => String(locality.id) === hospitalForm.locality_id)?.name_ar}</SelectValue></SelectTrigger><SelectContent>{filteredLocalities.map((locality) => <SelectItem key={locality.id} value={String(locality.id)}>{locality.name_ar}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label>الحي</Label><Select value={hospitalForm.neighborhood_id} disabled={!selectedLocalityId} onValueChange={(value) => setHospitalForm({ ...hospitalForm, neighborhood_id: value ?? "" })}><SelectTrigger className="w-full"><SelectValue placeholder="اختر الحي">{filteredNeighborhoods.find((neighborhood) => String(neighborhood.id) === hospitalForm.neighborhood_id)?.name_ar}</SelectValue></SelectTrigger><SelectContent>{filteredNeighborhoods.map((neighborhood) => <SelectItem key={neighborhood.id} value={String(neighborhood.id)}>{neighborhood.name_ar}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2 sm:col-span-2"><Label htmlFor="hospital-address">العنوان/الشارع</Label><Input id="hospital-address" name="address_line" required value={hospitalForm.address_line} onChange={(event) => setHospitalForm({ ...hospitalForm, address_line: event.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="contract-start">بداية العقد</Label><Input id="contract-start" name="contract_start" type="date" required value={hospitalForm.contract_start} onChange={(event) => setHospitalForm({ ...hospitalForm, contract_start: event.target.value })} /></div>
                </div>
                <Button type="submit">إضافة المستشفى</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>إضافة قسم</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={createDepartment}>
                <div className="grid gap-2"><Label>المستشفى</Label><Select value={departmentForm.hospital_id} onValueChange={(value) => setDepartmentForm({ ...departmentForm, hospital_id: value ?? "" })}><SelectTrigger className="w-full"><SelectValue placeholder="اختر المستشفى" /></SelectTrigger><SelectContent>{hospitals.map((hospital) => <SelectItem key={hospital.id} value={String(hospital.id)}>{hospital.name_ar}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="department-name-ar">اسم القسم بالعربية</Label><Input id="department-name-ar" name="name_ar" required value={departmentForm.name_ar} onChange={(event) => setDepartmentForm({ ...departmentForm, name_ar: event.target.value })} /></div>
                <div className="grid gap-2"><Label htmlFor="department-name-en">اسم القسم بالإنجليزية</Label><Input id="department-name-en" name="name_en" required value={departmentForm.name_en} onChange={(event) => setDepartmentForm({ ...departmentForm, name_en: event.target.value })} /></div>
                <div className="grid gap-2"><Label htmlFor="department-floor">الطابق</Label><Input id="department-floor" name="floor" type="number" required value={departmentForm.floor} onChange={(event) => setDepartmentForm({ ...departmentForm, floor: event.target.value })} /></div>
                <Button type="submit" disabled={!hospitals.length}>إضافة القسم</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>المستشفيات والأقسام</CardTitle>
            <CardDescription>افتح المستشفى لعرض الأقسام التابعة له وإدارتها.</CardDescription>
          </CardHeader>
          <CardContent>
            {hospitals.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد مستشفيات مسجلة.</p>
            ) : (
              <Accordion className="w-full" defaultValue={[String(hospitals[0].id)]}>
                {hospitals.map((hospital) => {
                  const hospitalDepartments = departments.filter(
                    (department) => department.hospital_id === hospital.id,
                  )

                  return (
                    <AccordionItem key={hospital.id} value={String(hospital.id)}>
                      <AccordionTrigger className="px-3">
                        <span className="flex min-w-0 flex-col items-start gap-1">
                          <span className="truncate font-medium">{hospital.name_ar}</span>
                          <span className="text-muted-foreground text-xs">
                            {hospital.code} · {hospital.neighborhood_name_ar ?? "دون حي محدد"} ·{" "}
                            {hospitalDepartments.length} أقسام
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-3">
                        <div className="border-border flex items-center justify-between gap-4 border-b pb-3">
                          <div>
                            <p className="text-sm font-medium">{hospital.name_en}</p>
                            <p className="text-muted-foreground text-xs">{hospital.license_number}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteResource("hospitals", hospital.id)}
                          >
                            حذف المستشفى
                          </Button>
                        </div>
                        <div className="grid gap-2 pt-3">
                          {hospitalDepartments.length === 0 ? (
                            <p className="text-muted-foreground text-sm">لا توجد أقسام مسجلة.</p>
                          ) : (
                            hospitalDepartments.map((department) => (
                              <div
                                className="bg-muted/40 flex items-center justify-between gap-4 rounded-md p-3"
                                key={department.id}
                              >
                                <div>
                                  <p className="font-medium">{department.name_ar}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {department.name_en} · الطابق {department.floor}
                                  </p>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteResource("departments", department.id)}
                                >
                                  حذف
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
