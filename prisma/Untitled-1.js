// ==========================================
// SIMPLE SHOPPING CART & INVENTORY MANAGER
// ==========================================


const storeName = "MyOnlineShop";
var inventory = [
  { id: 1, name: "Laptop", price: 800, qty: 10, cat: "electronics" },
  { id: 2, name: "Mouse", price: 25, qty: 50, cat: "electronics" },
  { id: 3, name: "Desk Chair", price: 150, qty: 5, cat: "furniture" },
  { id: 4, name: "Notebook", price: 5, qty: 200, cat: "stationery" }
];

var userCart = [];

function addItemToCart(pId, q) {
  console.log("Adding item to cart...");
  // smell 1 : deep nesting
  if (pId !== null && pId !== undefined) {  // smell 2 : instead of oId use fullforn like productId
    var found = false;
    
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === pId) {
        found = true;
        
        if (inventory[i].qty >= q) {
          inventory[i].qty = inventory[i].qty - q;
          
          userCart.push({
            id: inventory[i].id,
            name: inventory[i].name,
            price: inventory[i].price,
            qtyOrdered: q
          });
          
          console.log("Item added successfully: " + inventory[i].name);
          return true;
        } else {
          console.log("Error: Not enough stock available!");
          return false;
        }
      }
    }
    
    if (!found) {
      console.log("Error: Product ID not found in inventory.");
      return false;
    }
  } else {
    console.log("Error: Invalid product ID.");
    return false;
  }
}

function calculateCartTotal(uType) {
  console.log("Calculating total for user type: " + uType);
  var sub = 0;
  
  for (var j = 0; j < userCart.length; j++) {
    sub = sub + (userCart[j].price * userCart[j].qtyOrdered);
  }
  
  var tax = 0;
  var disc = 0;
  
  if (uType === "VIP") {
    if (sub > 500) {
      disc = sub * 0.20;
    } else {
      disc = sub * 0.10;
    }
    tax = (sub - disc) * 0.05;
  } else if (uType === "REGULAR") {
    if (sub > 1000) {
      disc = sub * 0.05;
    } else {
      disc = 0;
    }
    tax = (sub - disc) * 0.18;
  } else {
    disc = 0;
    tax = sub * 0.18;
  }
  
  var finalAmt = sub - disc + tax;
  
  console.log("Subtotal: " + sub);
  console.log("Discount: " + disc);
  console.log("Tax: " + tax);
  console.log("Final Amount: " + finalAmt);
  
  return finalAmt;
}

function processCheckout(uType, payMethod) {
  console.log("Starting checkout process...");
  var total = calculateCartTotal(uType);
  
  if (payMethod === "CARD") {
    console.log("Processing credit card payment of $" + total);
    if (total > 0) {
      console.log("Payment approved via Credit Card!");
      userCart = [];
      return true;
    } else {
      console.log("Cart is empty or invalid total.");
      return false;
    }
  } else if (payMethod === "CASH") {
    console.log("Processing cash on delivery payment of $" + total);
    if (total > 0) {
      console.log("Order confirmed for Cash on Delivery!");
      userCart = [];
      return true;
    } else {
      console.log("Cart is empty or invalid total.");
      return false;
    }
  } else {
    console.log("Error: Unknown payment method specified.");
    return false;
  }
}

function printInventoryReport() {
  console.log("=== INVENTORY REPORT ===");
  for (var k = 0; k < inventory.length; k++) {
    var item = inventory[k];
    console.log("ID: " + item.id + " | Name: " + item.name + " | Price: $" + item.price + " | Stock: " + item.qty + " | Category: " + item.cat);
  }
  console.log("========================");
}

// Test run execution
addItemToCart(1, 2);
addItemToCart(2, 5);
printInventoryReport();
processCheckout("VIP", "CARD");
printInventoryReport();