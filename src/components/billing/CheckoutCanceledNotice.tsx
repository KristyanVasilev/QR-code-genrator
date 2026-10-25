"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

/** Съобщение при връщане от Stripe без плащане (?checkout=canceled). */
export function CheckoutCanceledNotice() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("checkout") === "canceled");
  }, []);
  return show ? <p className="notice warn">{t.pricing.canceled}</p> : null;
}
