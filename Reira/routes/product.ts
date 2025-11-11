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

async function uploadCategoryIcon(
  file: Express.Multer.File,
  categoryName: string
) {
  try {
    const timestamp = Date.now();
    const sanitizedName = categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const extension =
      file.mimetype === "image/svg+xml" ? "svg" : file.mimetype.split("/")[1];
    const fileName = `category-icons/${sanitizedName}-${timestamp}.${extension}`;

    const { error } = await supabase.storage
      .from("airi")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("airi").getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading category icon:", error);
    throw error;
  }
}

// Helper function to delete category icon
async function deleteCategoryIcon(iconUrl: string) {
  try {
    if (!iconUrl) return;

    // Extract file path from URL
    const urlParts = iconUrl.split("/storage/v1/object/public/airi/");
    if (urlParts.length < 2 || !urlParts[1]) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage.from("airi").remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting category icon:", error);
    // Don't throw - allow category deletion even if icon deletion fails
  }
}

// Routes
// GET /api/menu-items/
router.get("/menu-items", async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = supabase
      .from("menu_items")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error.message);
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error fetching menu items (full):", error);
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
      const { name, price, available, category_id } = req.body;

      let imageData = null;
      if (req.file) {
        imageData = await uploadImageVariants(req.file);
      }

      const { data, error } = await supabase
        .from("menu_items")
        .insert([
          {
            name,
            price: parseFloat(price),
            image: imageData,
            available: available === "true",
            category_id: category_id,
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
      const { name, price, available, category_id } = req.body;

      const { data: existingItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("image")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      let imageData = existingItem?.image;
      if (req.file) {
        if (existingItem?.image) {
          await deleteImageVariantS(existingItem.image);
        }
        imageData = await uploadImageVariants(req.file);
      }

      const updateData: any = {
        name,
        price: parseFloat(price),
        available: available === "true",
        category_id: category_id || null,
      };

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

    const { data: item, error: fetchError } = await supabase
      .from("menu_items")
      .select("image")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (item?.image) {
      await deleteImageVariantS(item.image);
    }

    const { error } = await supabase
      .from("menu_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

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

// Create category with optional icon
router.post(
  "/categories",
  withAuth(["admin"]),
  upload.single("icon"),
  async (req, res) => {
    try {
      const { name } = req.body;

      let iconUrl = null;
      if (req.file) {
        iconUrl = await uploadCategoryIcon(req.file, name);
      }

      const { data, error } = await supabase
        .from("categories")
        .insert([{ name, icon_url: iconUrl }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  }
);

// Update category (including icon)
router.put(
  "/categories/:id",
  withAuth(["admin"]),
  upload.single("icon"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      // Get existing category to check for old icon
      const { data: existingCategory, error: fetchError } = await supabase
        .from("categories")
        .select("icon_url")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      let iconUrl = existingCategory?.icon_url;

      // Upload new icon if provided
      if (req.file) {
        // Delete old icon if exists
        if (existingCategory?.icon_url) {
          await deleteCategoryIcon(existingCategory.icon_url);
        }
        iconUrl = await uploadCategoryIcon(req.file, name);
      }

      const { data, error } = await supabase
        .from("categories")
        .update({ name, icon_url: iconUrl })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  }
);

// Delete category
router.delete("/categories/:id", withAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    // Get category to check for icon
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("icon_url")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Delete icon from storage if exists
    if (category?.icon_url) {
      await deleteCategoryIcon(category.icon_url);
    }

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
