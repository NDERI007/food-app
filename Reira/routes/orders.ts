import supabase from "@config/supabase";
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
router.get("/:orderID/details", async (req, res) => {
  try {
    const { orderID } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    console.log(`📦 Fetching order details for: ${orderID}`);

    const { data, error } = await supabase.rpc("get_order_details", {
      order_uuid: orderID,
    });

    if (error) {
      console.error("❌ RPC Error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (!data) {
      console.log(`⚠️ Order not found: ${orderID}`);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(`✅ Order found with ${data.order_items?.length ?? 0} items`);

    // Transform and validate data
    const order = {
      id: data.id,
      delivery_type: data.delivery_type,
      address: data.delivery_address_main_text || null,
      place_id: data.delivery_place_id || null,
      instructions: data.delivery_instructions || null,
      mpesa_phone: data.mpesa_phone || null,
      payment_reference: data.payment_reference || null,
      total_amount: Number(data.total_amount) || 0,
      created_at: data.created_at,
      items: Array.isArray(data.order_items)
        ? data.order_items.map((item: any) => ({
            quantity: Number(item.quantity) || 0,
            name: item.name || "Unknown Item",
            variant_size: item.variant_size || null,
          }))
        : [],
    };

    // Validation check
    if (order.items.length === 0) {
      console.warn(`⚠️ Order ${orderID} has no items`);
    }

    return res.json(order);
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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

    console.log("📋 Fetching order:", { orderID, userID });

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
          total_price,
          menu_items (
            name,
            image
          )
        )
      `
      )
      .eq("id", orderID)
      .eq("user_id", userID)
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    if (!data) {
      console.log("⚠️ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("✅ Order data fetched:", data);

    // Transform the data to match your interface
    const { order_items, ...orderData } = data;

    const transformedOrder = {
      ...orderData,
      items:
        order_items?.map((item) => ({
          id: item.id,
          product_name: item.menu_items?.[0]?.name || "Unknown Item",
          quantity: item.quantity,
          price: item.total_price,
          image_url: item.menu_items?.[0]?.image || null,
        })) || [],
    };

    console.log("📦 Transformed order:", transformedOrder);
    res.json({ order: transformedOrder });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      message: "Failed to fetch order",
      error: error instanceof Error ? error.message : String(error),
    });
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
import { stkPush } from "@utils/mpesa";

router.post("/create", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const orderData: CreateOrderRequest = req.body;

    // =====================================================
    // 1. BASIC VALIDATION
    // =====================================================
    if (!orderData.items?.length) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    if (!["delivery", "pickup"].includes(orderData.delivery_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery type",
      });
    }

    if (
      orderData.delivery_type === "delivery" &&
      (!orderData.delivery_address_main_text || !orderData.delivery_place_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery address required for delivery orders",
      });
    }

    if (!orderData.mpesa_phone) {
      return res.status(400).json({
        success: false,
        message: "M-PESA phone number is required",
      });
    }

    // Validate and clean phone number
    const phoneRegex = /^(254|0)?[17]\d{8}$/;
    let cleanPhone = orderData.mpesa_phone.replace(/[\s\-\(\)]/g, "");

    if (cleanPhone.startsWith("0")) {
      cleanPhone = "254" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("254")) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone format. Use: 254XXXXXXXXX or 07XXXXXXXX",
      });
    }

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid M-PESA phone number",
      });
    }

    console.log("🔍 RPC PAYLOAD:", {
      p_user_id: userID,
      p_delivery_type: orderData.delivery_type,
      p_mpesa_phone: cleanPhone,
      p_subtotal: orderData.subtotal,
      p_delivery_fee: orderData.delivery_fee,
      p_total_amount: orderData.total_amount,
      p_items: orderData.items,
      p_delivery_address_main_text: orderData.delivery_address_main_text,
      p_delivery_address_secondary_text:
        orderData.delivery_address_secondary_text,
      p_delivery_place_id: orderData.delivery_place_id,
      p_delivery_lat: orderData.delivery_lat,
      p_delivery_lng: orderData.delivery_lng,
      p_delivery_instructions: orderData.order_notes ?? null,
    });

    // =====================================================
    // 2. CREATE ORDER VIA RPC
    // =====================================================
    const { data: orderID, error: rpcError } = await supabase.rpc(
      "create_order_with_items",
      {
        p_user_id: userID,
        p_delivery_type: orderData.delivery_type,
        p_mpesa_phone: cleanPhone,
        p_subtotal: orderData.subtotal,
        p_delivery_fee: orderData.delivery_fee,
        p_total_amount: orderData.total_amount,
        p_items: orderData.items,
        p_delivery_address_main_text:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_address_main_text
            : null,
        p_delivery_address_secondary_text:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_address_secondary_text
            : null,
        p_delivery_place_id:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_place_id
            : null,
        p_delivery_lat:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_lat
            : null,
        p_delivery_lng:
          orderData.delivery_type === "delivery"
            ? orderData.delivery_lng
            : null,
        p_delivery_instructions: orderData.order_notes ?? null,
      }
    );

    if (rpcError) {
      console.error("❌ RPC Error:", rpcError);

      let errorMessage = "Failed to create order";

      if (rpcError.message.includes("unavailable")) {
        errorMessage = rpcError.message;
      } else if (rpcError.message.includes("requires a variant")) {
        errorMessage = rpcError.message;
      } else if (rpcError.message.includes("mismatch")) {
        errorMessage = "Price validation failed. Please refresh and try again.";
      } else if (rpcError.message.includes("Invalid product_id")) {
        errorMessage = "Some products are no longer available.";
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    if (!orderID) {
      return res.status(500).json({
        success: false,
        message: "Order creation failed",
      });
    }

    console.log(`✅ Order created: ${orderID}`);

    // =====================================================
    // 3. INITIATE M-PESA STK PUSH (SYNCHRONOUS)
    // =====================================================
    try {
      console.log(`💳 Initiating STK push for order ${orderID}`);

      const stkResponse = await stkPush(
        cleanPhone,
        orderData.total_amount,
        orderID
      );

      console.log(`✅ STK push successful for order ${orderID}`);

      // Update order with checkout request ID
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          checkout_request_id: stkResponse.CheckoutRequestID,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderID);

      if (updateError) {
        console.error("⚠️ Failed to update checkout_request_id:", updateError);
        // Don't fail the request - STK was sent successfully
      }

      return res.status(201).json({
        success: true,
        message:
          "Order created successfully. Please check your phone for the M-PESA payment prompt.",
        order: orderID,
      });
    } catch (stkError: any) {
      console.error(`❌ STK push failed for order ${orderID}:`, stkError);

      // Order was created but payment initiation failed
      // Mark order as failed so it doesn't stay in pending limbo
      try {
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderID);
      } catch (e) {
        console.error("Failed to update order status:", e);
      }

      // Provide user-friendly error message
      let userMessage = "Failed to initiate M-PESA payment. Please try again.";

      // Check for specific M-PESA errors
      const errorCode =
        stkError.response?.data?.errorCode ||
        stkError.response?.data?.ResponseCode ||
        stkError.errorCode;

      if (errorCode === "1032") {
        userMessage = "Payment request was canceled.";
      } else if (errorCode === "1") {
        userMessage = "Insufficient M-PESA balance.";
      } else if (errorCode === "2001") {
        userMessage = "Invalid M-PESA PIN or credentials.";
      } else if (
        stkError.code === "ETIMEDOUT" ||
        stkError.code === "ECONNREFUSED"
      ) {
        userMessage =
          "M-PESA service is temporarily unavailable. Please try again.";
      } else if (stkError.response?.status >= 500) {
        userMessage = "M-PESA service error. Please try again in a moment.";
      }

      return res.status(500).json({
        success: false,
        message: userMessage,
        order: orderID, // Return orderID so user can reference it
      });
    }
  } catch (error) {
    console.error("❌ Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
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
