import express from "express";
import multer from "multer";
import supabase from "@config/supabase";
import { withAuth } from "middleware/auth";
import { deleteImageVariantS, uploadImageVariants } from "@utils/imageVariants";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Routes
// GET /api/menu-items?category_id=some_id
router.get("/menu-items", async (req, res) => {
  try {
    // 1. Get the category_id from the URL's query string
    const { category_id } = req.query;

    // 2. Start building the query
    let query = supabase
      .from("menu_items")
      .select("*") // Also fetch related variants
      .order("name", { ascending: true });

    // 3. If a category_id is provided, add a filter
    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    // 4. Execute the final query
    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error.message);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Create new menu item
router.post(
  "/menu-items",
  withAuth(["admin"]),
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price, available, category_id } = req.body;

      // Upload image if provided
      let imageData = null;
      if (req.file) {
        imageData = await uploadImageVariants(req.file);
      }

      // Insert into database
      const { data, error } = await supabase
        .from("menu_items")
        .insert([
          {
            name,
            description: description || null,
            price: parseFloat(price),
            image: imageData,
            available: available === "true",
            category_id: category_id || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  }
);

// Update menu item
router.put(
  "/menu-items/:id",
  withAuth(["admin"]),
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, available, category_id } = req.body;

      // First, get the existing item to check for old image
      const { data: existingItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("image")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Upload new image if provided
      let imageData = existingItem?.image;
      if (req.file) {
        // Delete old image if exists
        if (existingItem?.image) {
          await deleteImageVariantS(existingItem.image);
        }
        // Upload new image
        imageData = await uploadImageVariants(req.file);
      }

      // Update in database
      const updateData: any = {
        name,
        description: description || null,
        price: parseFloat(price),
        available: available === "true",
        category_id: category_id || null,
      };

      // Only update image_url if a new image was uploaded
      if (req.file) {
        updateData.image = imageData;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  }
);

// Update availability only
router.patch(
  "/menu-items/:id/availability",
  withAuth(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { available } = req.body;

      const { data, error } = await supabase
        .from("menu_items")
        .update({ available })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  }
);

// Delete menu item
router.delete("/menu-items/:id", withAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    // Get item to check for image
    const { data: item, error: fetchError } = await supabase
      .from("menu_items")
      .select("image")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Delete image from storage if exists
    if (item?.image) {
      await deleteImageVariantS(item.image);
    }

    // Delete from database
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// Get all categories
router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Create category
router.post("/categories", withAuth(["admin"]), async (req, res) => {
  try {
    const { name } = req.body;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});
// Delete category
router.delete("/categories/:id", withAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ==========================
// Product Variants Routes
// ==========================

// Get all variants for a specific product
router.get("/menu-items/:id/variants", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({ error: "Failed to fetch product variants" });
  }
});

// Get single variant
router.get("/product-variants/:variantId", async (req, res) => {
  try {
    const { variantId } = req.params;

    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("id", variantId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Variant not found" });

    res.json(data);
  } catch (error) {
    console.error("Error fetching product variant:", error);
    res.status(500).json({ error: "Failed to fetch product variant" });
  }
});

// Create new variant
router.post(
  "/menu-items/:id/variants",
  withAuth(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { size_name, price, is_available } = req.body;

      const { data, error } = await supabase
        .from("product_variants")
        .insert([
          {
            product_id: id,
            size_name,
            price: parseFloat(price),
            is_available: is_available ?? true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Error creating product variant:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to create product variant" });
    }
  }
);

// Update existing variant
router.put(
  "/product-variants/:variantId",
  withAuth(["admin"]),
  async (req, res) => {
    try {
      const { variantId } = req.params;
      const { size_name, price, is_available } = req.body;

      const { data, error } = await supabase
        .from("product_variants")
        .update({
          size_name,
          price: parseFloat(price),
          is_available,
        })
        .eq("id", variantId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error updating product variant:", error);
      res.status(500).json({ error: "Failed to update product variant" });
    }
  }
);

// Delete variant
router.delete(
  "/product-variants/:variantId",
  withAuth(["admin"]),
  async (req, res) => {
    try {
      const { variantId } = req.params;

      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", variantId);

      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product variant:", error);
      res.status(500).json({ error: "Failed to delete product variant" });
    }
  }
);

export default router;
