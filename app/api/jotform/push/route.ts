import { NextResponse } from "next/server"
import { JOTFORM_ATTENDANCE_ID, JOTFORM_ATTENDANCE_SUBMIT } from "@/lib/constants"
import { JOTFORM_FIELD } from "@/lib/jotform"
import { formatPhone } from "@/lib/format"
import type { ClassType } from "@/lib/types"

export const runtime = "nodejs"

const STATUS: Record<ClassType, string> = {
  modeling: "Modeling",
  acting: "Acting",
  subscriber: "Subscriber",
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    firstName?: string
    lastName?: string
    phone?: string
    classType?: ClassType
  }
  if (!body.firstName || !body.lastName) {
    return NextResponse.json({ ok: false, message: "Need a first and last name." }, { status: 400 })
  }

  const form = new FormData()
  form.set("formID", JOTFORM_ATTENDANCE_ID)
  form.set("simple_spc", JOTFORM_ATTENDANCE_ID)
  form.set("website", "")
  form.set(JOTFORM_FIELD.first, body.firstName)
  form.set(JOTFORM_FIELD.last, body.lastName)
  form.set("q2_fullname0[first]", body.firstName)
  form.set("q2_fullname0[last]", body.lastName)
  form.set(JOTFORM_FIELD.phone, formatPhone(body.phone || ""))
  form.set("q4_phone2[full]", formatPhone(body.phone || ""))
  form.set(JOTFORM_FIELD.status, STATUS[body.classType || "modeling"])
  form.set("q5_radio3", STATUS[body.classType || "modeling"])

  try {
    const res = await fetch(JOTFORM_ATTENDANCE_SUBMIT, {
      method: "POST",
      body: form,
      headers: { Referer: `https://form.jotform.com/${JOTFORM_ATTENDANCE_ID}` },
      redirect: "manual",
    })
    const ok = res.ok || res.status === 302 || res.status === 303 || res.status === 307
    return NextResponse.json({
      ok,
      status: res.status,
      message: ok
        ? "Posted to the Jotform attendance tracker."
        : `Jotform returned ${res.status}. The desk still saved the check-in.`,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : "Could not reach Jotform.",
    })
  }
}
