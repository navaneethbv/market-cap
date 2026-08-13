"use client";

import { useState } from "react";

export function IdempotencyKeyInput() {
  const [key] = useState(() => crypto.randomUUID());

  return <input type="hidden" name="idempotencyKey" value={key} />;
}
