---
description: Verify PDF generation layout and data consistency
---

1. Navigate to Quotes List
   - Go to `http://localhost:5173/quotes`
   - Select a `Draft` or `Pending` quote (preferably one with products like "Dosificador").

2. Open Quote Builder (Preview Check)
   - Click "Editar" (or "Ver") to open the `QuoteBuilder`.
   - **Verify:** Check the "Vista Previa" (Preview) section on the right/bottom.
   - **Check:** Does the product "Dosificador" show full specs (Voltage, Power, Speed, Description)?
   - If yes, data refreshing is working.

3. Generate PDF (Layout Check)
   
   **Test A: Technical Template (Default/Requested)**
   - Ensure dropdown is set to "Ficha Técnica (Detallada)".
   - Click "Ver PDF".
   - **Verify:** Full pages for products, double footer on last page.

   **Test B: Standard Template (Simple)**
   - Change dropdown to "Estándar (Tabla Simple)".
   - Click "Ver PDF".
   - **Verify:** 
     - Single table with items.
     - No separate technical pages.
     - Compact conditions section.
     - Simple footer.

4. Verify PDF Content
   - **Page 2 (Technical Sheet):** Check if Specifications are cut off. There should be page breaks if the list is long.
   - **Page 3 (Conditions & Footer):**
     - Scroll to the bottom of the last page.
     - **Check:** Is there a formatted "Conditions" section?
     - **Check:** Is there an **Orange Line** above the "Orden de compra a" block?
     - **Check:** Is the "Orden de compra a" block clearly separated from the text above? (No overlap).
     - **Check:** Is there a **Second Orange Line** at the very bottom with centered text below it?
     - **Check:** Does the footer look "anchored" to the bottom of the page?

5. Success Criteria
   - No text overlap.
   - Full specs visible.
   - Double footer (Billing + Center) present on the last page.
