-- Supabase RPC Function: create_complete_bill
-- Calculates profit: sum((sell_price - buy_price) * quantity) - discount

-- IMPORTANT: Run this first to add the profit column:
-- ALTER TABLE public.bills ADD COLUMN profit NUMERIC DEFAULT 0;

DROP FUNCTION IF EXISTS create_complete_bill(text,text,numeric,numeric,numeric,jsonb);
DROP FUNCTION IF EXISTS create_complete_bill(text,text,text,numeric,numeric,numeric,jsonb);

CREATE OR REPLACE FUNCTION create_complete_bill(
  p_name TEXT,
  p_phone TEXT,
  p_address TEXT,
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
  v_buy_price NUMERIC;
  v_sell_price NUMERIC;
  v_total_profit NUMERIC := 0;
BEGIN
  -- First pass: validate stock and calculate profit
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT id, current_stock, buy_price, sell_price
      INTO v_item_id, v_current_stock, v_buy_price, v_sell_price
    FROM public.items_details
    WHERE id::TEXT = v_item->>'item_id';

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

    -- profit per item = (sell_price - buy_price) * quantity
    v_total_profit := v_total_profit + ((COALESCE(v_sell_price, 0) - COALESCE(v_buy_price, 0)) * v_quantity);
  END LOOP;

  -- Subtract discount from total profit
  v_total_profit := v_total_profit - COALESCE(p_discount, 0);

  -- Insert bill with profit
  INSERT INTO public.bills (name, phone, address, discount_price, courier_price, total_amount, profit)
  VALUES (p_name, p_phone, p_address, p_discount, p_courier, p_total, v_total_profit)
  RETURNING id INTO v_bill_id;

  -- Second pass: insert bill-items and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT id INTO v_item_id
    FROM public.items_details
    WHERE id::TEXT = v_item->>'item_id';

    INSERT INTO public."bill-items" (bill_id, item_id, quantity)
    VALUES (v_bill_id, v_item_id, v_quantity);

    UPDATE public.items_details
    SET current_stock = current_stock - v_quantity
    WHERE id = v_item_id;
  END LOOP;

  RETURN QUERY SELECT v_bill_id::TEXT, TRUE, 'Bill created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::TEXT, FALSE, SQLERRM::TEXT;
END;
$$;

-- Example usage:
-- SELECT * FROM create_complete_bill(
--   'John Doe',
--   '0758280611',
--   '123 Main Street, Colombo',
--   100.00,
--   50.00,
--   1450.00,
--   '[
--     {"item_id": 1, "quantity": 2, "price": 500.00},
--     {"item_id": 2, "quantity": 1, "price": 450.00}
--   ]'::jsonb
-- );
