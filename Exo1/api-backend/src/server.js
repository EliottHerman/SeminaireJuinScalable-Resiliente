import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT

app.use(cors());
app.use(express.json());

// Fake database en mémoire
let products = [
  {
    id: 1,
    name: "T-shirt noir",
    price: 29.99,
    stock: 20,
    category: "clothes"
  },
  {
    id: 2,
    name: "Casquette rouge",
    price: 19.99,
    stock: 15,
    category: "accessories"
  },
  {
    id: 3,
    name: "Sac tote bag",
    price: 14.99,
    stock: 30,
    category: "accessories"
  }
];

let carts = {};
let orders = [];

// Accueil
app.get("/", (req, res) => {
  res.json({
    message: "API e-commerce Express.js",
    endpoints: [
      "GET /products",
      "GET /products/:id",
      "POST /products",
      "POST /cart/:userId/add",
      "GET /cart/:userId",
      "POST /orders/:userId"
    ]
  });
});

// Récupérer tous les produits
app.get("/products", (req, res) => {
  const { category } = req.query;

  let result = products;

  if (category) {
    result = products.filter(product => product.category === category);
  }

  res.json(result);
});

// Récupérer un produit par ID
app.get("/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const product = products.find(product => product.id === productId);

  if (!product) {
    return res.status(404).json({
      error: "Produit introuvable"
    });
  }

  res.json(product);
});

// Créer un produit
app.post("/products", (req, res) => {
  const { name, price, stock, category } = req.body;

  if (!name || price == null || stock == null || !category) {
    return res.status(400).json({
      error: "Champs requis : name, price, stock, category"
    });
  }

  const newProduct = {
    id: products.length + 1,
    name,
    price,
    stock,
    category
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});

// Ajouter un produit au panier
app.post("/cart/:userId/add", (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  const product = products.find(product => product.id === Number(productId));

  if (!product) {
    return res.status(404).json({
      error: "Produit introuvable"
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      error: "La quantité doit être supérieure à 0"
    });
  }

  if (product.stock < quantity) {
    return res.status(400).json({
      error: "Stock insuffisant"
    });
  }

  if (!carts[userId]) {
    carts[userId] = [];
  }

  const existingItem = carts[userId].find(
    item => item.productId === Number(productId)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[userId].push({
      productId: Number(productId),
      quantity
    });
  }

  res.json({
    message: "Produit ajouté au panier",
    cart: carts[userId]
  });
});

// Voir le panier
app.get("/cart/:userId", (req, res) => {
  const { userId } = req.params;
  const cart = carts[userId] || [];

  const detailedCart = cart.map(item => {
    const product = products.find(product => product.id === item.productId);

    return {
      productId: item.productId,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      total: product.price * item.quantity
    };
  });

  const total = detailedCart.reduce((sum, item) => sum + item.total, 0);

  res.json({
    items: detailedCart,
    total
  });
});

// Créer une commande à partir du panier
app.post("/orders/:userId", (req, res) => {
  const { userId } = req.params;
  const cart = carts[userId] || [];

  if (cart.length === 0) {
    return res.status(400).json({
      error: "Le panier est vide"
    });
  }

  const orderItems = [];

  for (const item of cart) {
    const product = products.find(product => product.id === item.productId);

    if (!product) {
      return res.status(404).json({
        error: `Produit ${item.productId} introuvable`
      });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        error: `Stock insuffisant pour ${product.name}`
      });
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      total: product.price * item.quantity
    });
  }

  // Décrémenter le stock
  for (const item of cart) {
    const product = products.find(product => product.id === item.productId);
    product.stock -= item.quantity;
  }

  const total = orderItems.reduce((sum, item) => sum + item.total, 0);

  const order = {
    id: orders.length + 1,
    userId,
    items: orderItems,
    total,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  // Vider le panier
  carts[userId] = [];

  res.status(201).json(order);
});

// Voir toutes les commandes
app.get("/orders", (req, res) => {
  res.json(orders);
});

// Voir les commandes d'un utilisateur
app.get("/orders/user/:userId", (req, res) => {
  const { userId } = req.params;

  const userOrders = orders.filter(order => order.userId === userId);

  res.json(userOrders);
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route introuvable"
  });
});

app.listen(PORT,"0.0.0.0", () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});
