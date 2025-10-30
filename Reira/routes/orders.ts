import supabase from "@config/supabase";
import { stkPush } from "@utils/mpesa";
import express from "express";
import { withAuth } from "middleware/auth";

const router = express.Router();

// Protected routes (auth required)
router.use(withAuth());

/**
 * GET /api/orders
 * Get all orders for authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const userID = req.user?.userID;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        status,
        total_amount,
        payment_status,
        payment_method,
        delivery_type,
        delivery_instructions,
        created_at,
        order_items (
          id,
          quantity,
          price,
          subtotal,
          menu_items (
            id,
            name,
            description,
            image_url
          )
        ),
      `
      )
      .eq("user_id", userID)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ orders: data || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * GET /api/orders/:orderId
 * Get single order details for authenticated user
 */
router.get("/:orderID", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { orderID } = req.params;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        delivery_type,
        delivery_address_main_text,
        delivery_address_secondary_text,
        delivery_instructions,
        status,
        payment_method,
        payment_status,
        payment_reference,
        mpesa_phone,
        subtotal,
        delivery_fee,
        total_amount,
        order_notes,
        created_at,
        order_items (
          id,
          quantity,
          price,
          menu_items (
            name,
            image_url
          )
        )
      `
      )
      .eq("id", orderID)
      .eq("user_id", userID)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Transform the data to match your interface
    const { order_items, ...orderData } = data;

    const transformedOrder = {
      ...orderData,
      items: order_items?.map((item) => ({
        id: item.id,
        product_name: item.menu_items[0]?.name,
        quantity: item.quantity,
        price: item.price,
        image_url: item.menu_items[0]?.image_url,
      })),
    };

    res.json({ order: transformedOrder });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// Add this to your orders router
router.get("/:orderID/payment-status", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { orderID } = req.params;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        payment_status,
        status
      `
      )
      .eq("id", orderID)
      .eq("user_id", userID)
      .single();

    if (error) {
      console.error("Supabase order insert error:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      });
    }

    if (!data) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Payment is complete when status is 'paid'
    const isComplete = data.payment_status === "paid";

    // Check if payment failed or was cancelled
    const hasFailed = ["failed", "cancelled"].includes(
      data.payment_status || ""
    );

    res.json({
      id: data.id,
      payment_status: data.payment_status,
      status: data.status,
      is_complete: isComplete,
      has_failed: hasFailed,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ message: "Failed to fetch payment status" });
  }
});

/**
 * POST /api/orders/create
 * Create a new order
 */
interface OrderItem {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

interface CreateOrderRequest {
  delivery_type: "delivery" | "pickup";
  delivery_address_main_text?: string;
  delivery_address_secondary_text?: string;
  delivery_place_id?: string;
  delivery_lat?: number;
  delivery_lng?: number;

  payment_method: "mpesa";
  mpesa_phone: string;

  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_notes?: string;

  items: OrderItem[];
}

router.post("/create", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const orderData: CreateOrderRequest = req.body;

    // =====================================================
    // 1. VALIDATION
    // =====================================================
    if (!orderData.items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Order items are required" });
    }

    if (!["delivery", "pickup"].includes(orderData.delivery_type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid delivery type" });
    }

    if (
      orderData.delivery_type === "delivery" &&
      (!orderData.delivery_address_main_text || !orderData.delivery_place_id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery address and place ID are required for delivery orders",
      });
    }

    if (!orderData.mpesa_phone) {
      return res
        .status(400)
        .json({ success: false, message: "M-PESA phone number is required" });
    }

    if (
      orderData.total_amount !==
      orderData.subtotal + orderData.delivery_fee
    ) {
      return res.status(400).json({
        success: false,
        message: "Total amount must equal subtotal + delivery fee",
      });
    }

    // =====================================================
    // 2. FETCH PRODUCTS & VARIANTS
    // =====================================================
    const productIds = [...new Set(orderData.items.map((i) => i.product_id))];
    const variantIds = orderData.items
      .filter((i) => i.variant_id)
      .map((i) => i.variant_id!);

    const { data: products, error: productsError } = await supabase
      .from("menu_items")
      .select("id, name, description, price, available")
      .in("id", productIds);

    if (productsError || !products?.length) {
      throw new Error("Failed to fetch products");
    }

    let variants: any[] = [];
    if (variantIds.length > 0) {
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("id, product_id, size_name, price, is_available")
        .in("id", variantIds);

      if (variantsError) throw new Error("Failed to fetch variants");
      variants = variantsData ?? [];
    }

    // =====================================================
    // 3. VALIDATE ITEMS & CALCULATE SUBTOTAL
    // =====================================================
    const unavailable: string[] = [];
    let calculatedSubtotal = 0;

    const validatedItems = orderData.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      if (!product.available) unavailable.push(product.name);

      if (item.variant_id) {
        const variant = variants.find((v) => v.id === item.variant_id);
        if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
        if (!variant.is_available)
          unavailable.push(`${product.name} - ${variant.size_name}`);

        const price = Number(variant.price);
        calculatedSubtotal += price * item.quantity;

        return {
          product_id: product.id,
          variant_id: variant.id,
          item_name: `${product.name} - ${variant.size_name}`,
          item_description: product.description,
          quantity: item.quantity,
          unit_price: price,
        };
      } else {
        const price = Number(product.price);
        calculatedSubtotal += price * item.quantity;

        return {
          product_id: product.id,
          variant_id: null,
          item_name: product.name,
          item_description: product.description,
          quantity: item.quantity,
          unit_price: price,
        };
      }
    });

    if (unavailable.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items are unavailable",
        unavailable_items: unavailable,
      });
    }

    if (Math.abs(calculatedSubtotal - orderData.subtotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Price mismatch detected",
        calculated: calculatedSubtotal,
        provided: orderData.subtotal,
      });
    }

    // =====================================================
    // 4. CREATE ORDER
    // =====================================================
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userID,
        delivery_type: orderData.delivery_type,
        delivery_address_main_text:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_address_main_text
            : null,
        delivery_address_secondary_text:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_address_secondary_text
            : null,
        delivery_place_id:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_place_id
            : null,
        delivery_lat:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_lat
            : null,
        delivery_lng:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_lng
            : null,
        delivery_instructions: orderData.order_notes ?? null,
        payment_method: "mpesa",
        mpesa_phone: orderData.mpesa_phone,
        payment_status: "unpaid",
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        total_amount: orderData.total_amount,
        status: "pending",
      })
      .select("id, total_amount, status, payment_status, created_at")
      .single();

    if (orderError) {
      console.error("Supabase order insert error:", orderError);
      return res.status(500).json({
        success: false,
        error: {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
        },
      });
    }

    // =====================================================
    // 5. INSERT ORDER ITEMS
    // =====================================================
    const { error: itemsError } = await supabase.from("order_items").insert(
      validatedItems.map((i) => ({
        order_id: order.id,
        ...i,
      }))
    );

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Failed to insert order items");
    }

    // =====================================================
    // 6. TRIGGER M-PESA PAYMENT
    // =====================================================
    try {
      const stkResponse = await stkPush(
        orderData.mpesa_phone,
        orderData.total_amount,
        order.id
      );
      console.log("✅ STK Push triggered:", stkResponse);
      await supabase
        .from("orders")
        .update({ checkout_request_id: stkResponse.CheckoutRequestID })
        .eq("id", order.id);
      return res.status(201).json({
        success: true,
        message: "Order created and STK push sent successfully",
        order: order.id,
      });
    } catch (error) {
      console.error("M-PESA STK Push error:", error);
      return res.status(201).json({
        success: true,
        message: "Order created, but M-PESA STK push failed",
        order: order.id,
      });
    }
  } catch (error) {
    console.error("Order creation error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ success: false, message });
  }
});

/**
 * POST /api/orders/:orderId/confirm-delivery
 * Customer confirms delivery
 */
router.post("/:orderId/confirm-delivery", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { orderId } = req.params;
    const { delivery_code } = req.body;

    if (!delivery_code) {
      return res.status(400).json({ message: "Delivery code is required" });
    }

    // Verify delivery code and update
    const { data, error } = await supabase
      .from("orders")
      .update({
        delivery_confirmed: true,
        customer_confirmed_at: new Date().toISOString(),
        status: "delivered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", userID)
      .eq("delivery_code", delivery_code)
      .eq("delivered_by_rider", true)
      .eq("delivery_confirmed", false)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(400).json({
        message: "Invalid delivery code or order not ready for confirmation",
      });
    }

    res.json({
      success: true,
      message: "Delivery confirmed successfully",
      order: data,
    });
  } catch (error) {
    console.error("Error confirming delivery:", error);
    res.status(500).json({ message: "Failed to confirm delivery" });
  }
});

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order (only if not yet confirmed by admin)
 */
router.post("/:orderId/cancel", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", userID)
      .in("status", ["pending", "confirmed"])
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(400).json({
        message: "Order cannot be cancelled at this stage",
      });
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: data,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

export default router;
