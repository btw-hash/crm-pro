"use client";

import { useActionState } from "react";
import { requestSampleAction, updateSampleAction } from "../actions";
import type { SampleRequest } from "@/domain/sample/sample-request";

interface ProductOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Sample request form. Works in two modes:
 * - create (existing=undefined): creates a new request with product and quantity selection.
 * - edit (existing=SampleRequest): edits the quantity on an existing request.
 */
export function SampleRequestForm({
  dealId,
  products,
  existing,
}: {
  dealId: string;
  products: readonly ProductOption[];
  existing?: SampleRequest;
}) {
  const [createState, createAction, createPending] = useActionState(requestSampleAction, null);
  const [updateState, updateAction, updatePending] = useActionState(updateSampleAction, null);

  const isEdit = existing !== undefined;
  const state = isEdit ? updateState : createState;
  const action = isEdit ? updateAction : createAction;
  const pending = isEdit ? updatePending : createPending;

  const productName = isEdit
    ? (products.find((p) => p.id === existing.productId)?.name ?? existing.productId)
    : null;

  return (
    <form action={action} className="form">
      <input type="hidden" name="dealId" value={dealId} />
      {isEdit ? (
        <>
          <input type="hidden" name="sampleId" value={existing.id} />
          <p className="muted">Product: {productName}</p>
        </>
      ) : (
        <label>
          Product for the test batch
          <select name="productId" defaultValue="">
            <option value="" disabled>
              — select a product —
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Quantity (kg)
        <input
          name="quantity"
          type="number"
          step="0.1"
          min="0.1"
          defaultValue={isEdit ? existing.quantity : 2}
        />
      </label>
      {state && !state.ok ? <p className="error">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Save quantity" : "Request test (reserve a sample)"}
      </button>
    </form>
  );
}
