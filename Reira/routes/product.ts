import express from "express";

import multer from "multer";

import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import supabase from "@config/supabase";

dotenv.config();

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

// Types
interface MenuItem {
  id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  available: boolean;
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
}

// Helper function to upload image to Supabase Storage
async function uploadImageToSupabase(
  file: Express.Multer.File
): Promise<string | null> {
  try {
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `menu-items/${fileName}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("food-images") // Make sure this bucket exists in your Supabase project
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    // Get the public URL
    const { data } = supabase.storage
      .from("food-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadImageToSupabase:", error);
    return null;
  }
}

// Helper function to delete image from Supabase Storage
async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split("/");
    const filePath = `menu-items/${urlParts[urlParts.length - 1]}`;

    await supabase.storage.from("food-images").remove([filePath]);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// Routes

// Get all menu items
router.get("/api/menu-items", async (req, res) => {
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
router.get("/api/menu-items/:id", async (req, res) => {
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
router.post("/api/menu-items", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, available, category_id } = req.body;

    // Upload image if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImageToSupabase(req.file);
    }

    // Insert into database
    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          name,
          description: description || null,
          price: parseFloat(price),
          image_url: imageUrl,
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
router.put("/api/menu-items/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, available, category_id } = req.body;

    // First, get the existing item to check for old image
    const { data: existingItem, error: fetchError } = await supabase
      .from("menu_items")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Upload new image if provided
    let imageUrl = existingItem?.image_url;
    if (req.file) {
      // Delete old image if exists
      if (existingItem?.image_url) {
        await deleteImageFromSupabase(existingItem.image_url);
      }
      // Upload new image
      imageUrl = await uploadImageToSupabase(req.file);
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
      updateData.image_url = imageUrl;
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
router.patch("/api/menu-items/:id/availability", async (req, res) => {
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
router.delete("/api/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get item to check for image
    const { data: item, error: fetchError } = await supabase
      .from("menu_items")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Delete image from storage if exists
    if (item?.image_url) {
      await deleteImageFromSupabase(item.image_url);
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
router.get("/api/categories", async (req, res) => {
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
router.post("/api/categories", async (req, res) => {
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
