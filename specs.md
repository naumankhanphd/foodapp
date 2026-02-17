# req.pdf

## Page 1

1) Users
1.1 Customer
- Register/login
- Browse menu
- Place orders (dine-in or delivery)
- Pay (online or cash on delivery / pay at counter)
- View order status + show estimated time.
- Offers (I've asked him: do you need a section for daily/weekly offers etc.?)

1.2 Restaurant Staff (admin dashboard)
- Login
- Receive new orders + notifications (we need to notify them somehow)
- Update order status (Accepted -> Preparing -> Ready/Out for delivery -> Completed)
- View live order queue
- Manage menu, prices, availability
- Manage offers (do it from the web or from the code?)
- Manage payment settings
- Reports (sales, popular items) (this will help them keep a record).

1.3 Guest

2) Core modules
2.1 Authentication
1. Signup/login
- Login form
- Google
- Email + password
- Signup form
- Google but will require another form for unset mandatory information.
- Email, password, phone, address (with location)

## Page 2

- Verify phone code.
2. Password reset via email
3. Session handling (JWT or server sessions)
4. Role-based access control (RBAC)

2.2 Menu
2.2.1 Menu structure
- Categories (e.g., Starters, Mains, Drinks)
- Items:
- name, description, images
- base price
- availability (active/inactive)
- prep time estimate (optional)
- dietary tags (veg/vegan/spicy)
- allergens (recommended)
- Add-ons/modifiers:
- extra cheese, size, spice level, etc.
- modifier rules: required/optional, min/max selections

2.3 ordering
2.3.1 ordering features
- Cart:
- add/remove items
- modifiers/add-ons
- quantity
- special instructions per item
- Checkout:
- calculate subtotal, discount, tax or VAT if not included in price then it should also be mentioned in the menu, delivery fee, total
- select payment method
- Order tracking:
- timeline/status updates
- Order history:
- repeat order (optional but recommended)

## Page 3

2.3.2 Delivery order requirements
- Address management:
- saved addresses
- delivery notes (gate code, call on arrival)
- Delivery fee rules:
- flat fee OR distance-based OR zone-based
- Delivery zones:
- if out of zone -> block order or show message
- Delivery status:
- Accepted -> Preparing -> Out for delivery -> Delivered

2.3.3 Dine in and self pickup
- Order from web
- Pay in web or in cash.

2.4 Payment
2.4.1 Flatpay
- Visa
- Mastercard
- Google pay
- Apple pay
- Paypal
- Klarna
- Mobile pay

2.4.2 Cash
- Dine-in
- Self pickup

## Page 4

2.4.3 Payment states
- Unpaid
- Authorized
- Paid
- Failed
- Refunded (partial/full)

2.5 Other
2.5.1 Offers discount
- Percentage discount (e.g., 10% off)
- Fixed amount discount (e.g., EUR 5 off)
- offers
- Free delivery
- Min/max order price limit
- Duration
- applicable to dine-in only / delivery only / both

2.6 Notification syte.
I don't know how.

2.7 Real-time delivery mechanism
Should we?
