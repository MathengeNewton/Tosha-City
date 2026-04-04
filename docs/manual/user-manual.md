# 1. Introduction

## Purpose
This section explains what the application is for and how the main parts fit together.

## What The System Does
The application helps a butchery run daily operations from opening stock to final sales and reporting.

The system supports:
- branch-based operations
- stock sessions
- raw stock control
- production of prepared items such as mutura, soup, and pork products
- customer sales
- payments
- partner stock sharing
- branch reporting

## Core Idea
The system works in this order:

1. Set up the branch and users
2. Set up products and recipes
3. Open a stock session for the day
4. Record stock entries
5. Record production runs if prepared items are made
6. Make sales
7. Record payments
8. Record wastage or stock share if needed
9. Close the stock session
10. Review reports

## Main Navigation Areas

### Dashboard
Use the dashboard to see where you are starting from.

Admins see:
- branch overview
- branches currently running
- quick access to reports and branches

Cashiers see:
- current session status
- today’s sales and revenue
- quick actions for stock and sales

### Stock Session
Use this area to open the day, record stock, manage production, and close the day.

**Role note:** Cashiers can **add** opening, incoming, closing, and wastage entries during operations. **Editing or deleting a stock entry that was already saved** is **admin only** (corrections and governance).

### Sales
Use this area to:
- create a new sale
- review existing sales
- record payment
- print a receipt for paid sales

**Role note:** Cashiers can create sales and record payments. **Changing or deleting an existing sale** (for example correcting payment method or removing a mistaken unpaid sale) is **admin only**.

### Products
Use this area to create and maintain items sold or consumed by the business.

### Recipes
Use this area to define how prepared items are made.

### Suppliers
Use this area to keep supplier records for incoming stock.

### Customers
Use this area to keep customer records, including credit and wholesale customers.

### Partners
Use this area to:
- keep partner records
- record partner stock shares
- mark shared stock as paid

### Reports
Admins use this area to review branch performance and operational totals.

## Important Terms

### Branch
A business location or operating unit.

Example:
- General butchery
- Pork butchery

### Stock Session
A day’s working stock record for a branch.

This is the main daily container for:
- opening stock
- incoming stock
- closing stock
- wastage
- production
- sales

### Product
Any item tracked or sold in the system.

Examples:
- beef
- mutura
- bone soup
- salt

### Production Item
A product that is produced from a recipe and then sold.

Examples:
- mutura
- bone soup
- mutton soup
- pork fry

### Recipe
A setup record showing:
- what product is produced
- what ingredients are needed
- how much output is expected

### Production Run
A real production record made during a stock session.

It records:
- the recipe used
- actual output
- ingredient quantities used
- wastage

### Customer Types
- Regular: normal customer
- Credit: customer allowed to buy on credit
- Wholesale: customer who should use wholesale pricing

### Partner Stock Share
Stock given to a partner and tracked separately for payment follow-up.

## Rules Every User Should Understand
- Non-admin users must belong to a branch.
- Sales should only be made when there is an open stock session.
- Some products are sold by weight, some by portions, cups, or pieces.
- Recipes can only use a final product that already exists as a production item.
- A stock session should only be closed after required work is complete.
- **Corrections:** only **admins** can edit or delete **existing** sales and **saved** stock entries. Cashiers should get an admin if something was entered wrong after it was saved.

## Recommended Learning Path
If you are new:

1. Read the role guide
2. If you are an admin, complete the setup guide
3. If you are a cashier, read the cashier operations guide
4. Keep the SOP section open during real work
