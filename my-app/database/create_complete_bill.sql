-- Supabase RPC Function: create_complete_bill
-- This function creates a new bill, adds bill items, and updates inventory stock

-- Drop the existing function first
DROP FUNCTION IF EXISTS create_complete_bill(text,text,numeric,numeric,numeric,jsonb);

CREATE OR REPLACE FUNCTION create_complete_bill(
  p_name TEXT,
  p_phone TEXT,
  p_discount NUMERIC,
  p_courier NUMERIC,
  p_total NUMERIC,
  p_items JSONB
)
RETURNS TABLE(bill_id TEXT, success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bill_id public.bills.id%TYPE;
  v_item JSONB;
  v_item_id public.items_details.id%TYPE;
  v_quantity INTEGER;
  v_current_stock INTEGER;
BEGIN
  -- Insert into bills table
  INSERT INTO public.bills (name, phone, discount_price, courier_price, total_amount)
  VALUES (p_name, p_phone, p_discount, p_courier, p_total)
  RETURNING id INTO v_bill_id;

  -- Loop through items and process each one
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    -- Resolve item by matching textual id to support numeric or UUID identifiers
    SELECT id, current_stock
      INTO v_item_id, v_current_stock
    FROM public.items_details
    WHERE id::TEXT = v_item->>'item_id';

    -- Validate item existence and stock
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Item with identifier % not found', v_item->>'item_id';
    END IF;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Stock not defined for item %', v_item_id::TEXT;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Required: %', 
        v_item_id::TEXT, v_current_stock, v_quantity;
    END IF;

    -- Insert into bill-items table (note: table name has hyphen, so use double quotes)
    INSERT INTO public."bill-items" (bill_id, item_id, quantity)
    VALUES (v_bill_id, v_item_id, v_quantity);

    -- Decrease stock in items_details
    UPDATE public.items_details
    SET current_stock = current_stock - v_quantity
    WHERE id = v_item_id;
  END LOOP;

  -- Return success
  RETURN QUERY SELECT v_bill_id::TEXT, TRUE, 'Bill created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    RETURN QUERY SELECT NULL::TEXT, FALSE, SQLERRM::TEXT;
END;
$$;

-- Example usage:
-- SELECT * FROM create_complete_bill(
--   'John Doe',
--   '0758280611',
--   100.00,
--   50.00,
--   1450.00,
--   '[
--     {"item_id": 1, "quantity": 2, "price": 500.00},
--     {"item_id": 2, "quantity": 1, "price": 450.00}
--   ]'::jsonb
-- );
