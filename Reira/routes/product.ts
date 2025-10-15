import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import supabase from "@config/supabase";
import { withAuth } from "middleware/auth";
import { deleteImageVariantS, uploadImageVariants } from "@utils/imageVariants";

const router = express.Router();

router.use(withAuth());

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 5MB limit
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

// Get all menu items
router.get("/menu-items", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Get single menu item
router.get("/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ error: "Failed to fetch menu item" });
  }
});

// Create new menu item
router.post("/menu-items", upload.single("image"), async (req, res) => {
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
});

// Update menu item
router.put("/menu-items/:id", upload.single("image"), async (req, res) => {
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
});

// Update availability only
router.patch("/menu-items/:id/availability", async (req, res) => {
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
});

// Delete menu item
router.delete("/menu-items/:id", async (req, res) => {
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
router.post("/categories", async (req, res) => {
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
router.delete("/categories/:id", async (req, res) => {
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
export default router;
