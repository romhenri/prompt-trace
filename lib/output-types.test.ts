import { describe, expect, it } from "vitest";
import { OUTPUT_TYPES, SERVICE_INFO, servicesOfType } from "./output-types";
import { SERVICE_OUTPUT_TYPE, type ServiceId } from "./verbosity";

describe("output types", () => {
  it("describes every type that a service uses", () => {
    const used = new Set(Object.values(SERVICE_OUTPUT_TYPE));
    expect(new Set(OUTPUT_TYPES.map((t) => t.id))).toEqual(used);
  });

  it("has display info and an absolute href for every service", () => {
    for (const id of Object.keys(SERVICE_OUTPUT_TYPE) as ServiceId[]) {
      expect(SERVICE_INFO[id].title.trim()).not.toBe("");
      expect(SERVICE_INFO[id].href).toMatch(/^\//);
    }
  });

  it("lists each service under exactly one type", () => {
    const all = OUTPUT_TYPES.flatMap((t) => servicesOfType(t.id));
    expect(all.sort()).toEqual(Object.keys(SERVICE_OUTPUT_TYPE).sort());
  });
});
