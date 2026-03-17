# ToshaCity Butchery Complete User Manual

## Purpose
This manual teaches a new admin or cashier how to use the application step by step.

## Intended Audience
- Admin users
- Cashier users
- Supervisors training new users

## How To Use This Manual
Read it in this order:

1. Introduction
2. Role Guide
3. Admin Setup Guide
4. Cashier Operations Guide
5. SOP And Process Flows
6. Reports Guide
7. Appendix

## 1. Introduction

### What The System Does
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

### Core Idea
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

### Main Navigation Areas

#### Dashboard
Admins use the dashboard for branch overview and reporting access.

Cashiers use the dashboard for:
- session status
- today’s sales
- quick links to stock and sales

#### Stock Session
Use this area to open the day, record stock, manage production, and close the day.

#### Sales
Use this area to:
- create a new sale
- review existing sales
- record payment
- print a receipt for a paid sale

#### Products
Use this area to create and maintain items sold or consumed by the business.

#### Recipes
Use this area to define how prepared items are made.

#### Suppliers
Use this area to keep supplier records for incoming stock.

#### Customers
Use this area to keep customer records, including credit and wholesale customers.

#### Partners
Use this area to:
- keep partner records
- record partner stock shares
- mark shared stock as paid

#### Reports
Admins use this area to review branch performance and operational totals.

### Important Terms
- `Branch`: a business location or operating unit
- `Stock Session`: the daily working stock record for a branch
- `Product`: an item tracked or sold in the system
- `Production Item`: a product made from a recipe and then sold
- `Recipe`: the planned setup of ingredients and expected output
- `Production Run`: an actual production record inside a stock session
- `Opening Stock`: what is available at the start of the session
- `Closing Stock`: what remains at the end of the session
- `Sale Mode`: the selling method, such as weight, portion, cup, or piece

### Rules Every User Should Understand
- Non-admin users must belong to a branch.
- Sales should only be made when there is an open stock session.
- Some products are sold by weight, some by portions, cups, or pieces.
- Recipes can only use a final product that already exists as a production item.
- A stock session should only be closed after required work is complete.

## 2. Role Guide

### Admin Role

#### Main Responsibility
The admin sets up the system, controls branch structure, manages staff access, reviews reports, and supervises branch performance.

#### Admin Can Do
- view the branch reporting dashboard
- create and manage branches
- create and manage users
- create and manage products
- create and manage recipes
- create suppliers, customers, and partners
- review reports
- view activity logs
- create sales
- record payments
- open and close stock sessions
- record production runs

### Cashier Role

#### Main Responsibility
The cashier runs day-to-day branch work.

#### Cashier Can Do
- use the cashier dashboard
- open and close stock sessions
- record stock entries
- record production runs
- create sales
- record payments
- create products
- create and update recipes
- create suppliers
- create customers
- create partners
- update partners

#### Cashier Cannot Do
- open reports
- manage branches
- manage users
- open settings
- use other admin-only oversight areas

### Branch Responsibility Rule
Each cashier works within an assigned branch. Always confirm the branch before opening a session or creating a sale.

## 3. Admin Setup Guide

### Setup Order
Follow this order:

1. Create branches
2. Create users and assign branches
3. Create products
4. Create recipes
5. Create suppliers
6. Create customers
7. Create partners
8. Confirm cashier access and branch assignment

### Create Branches
Open the `Branches` page and click `Add Branch`.

Fill in:
- `Name`
- `Code`
- `Type`
- `Active`

Save the branch and confirm it appears in the branch list.

### Create Users
Open `Users Management` and click `Create User`.

Fill in:
- `Username`
- `Email`
- `Password`
- `Role`
- `Branch`

Important:
- non-admin users must be assigned to a branch
- cashier users should normally have only the cashier role

### Create Products
Open `Products Management` and click `Add Product`.

Fill in:
- `Name`
- `Unit`
- `Retail price`
- `Wholesale price`
- `Category`
- `Sale Mode`
- `Sales Prompt` if needed
- `Active`

Examples:
- Beef: raw stock, weight
- Mutura: production item, portion
- Bone soup: production item, cup

Important:
If you want a product to appear in the recipe final product list, create it as a `Production item`.

### Create Recipes
Open `Recipes` and click `Add Recipe`.

Fill in:
- `Recipe Name`
- `Branch Scope`
- `Finished Product`
- `Expected Output`
- `Unit`

Then add ingredients:
- `Linked Product` if it already exists
- `Ingredient Name`
- `Estimated Qty`
- `Unit`

Save the recipe and confirm it appears in the recipes list.

### Create Suppliers
Open `Suppliers` and click `Add Supplier`.

Fill in:
- `Name`
- `Contact Person`
- `Phone`
- `Email`
- `Address`
- `Notes`
- `Active`

### Create Customers
Open `Customers` and click `Add Customer`.

Fill in:
- `Name`
- `Phone`
- `Email`
- `Address`
- `Customer Type`
- `Credit Limit` when using credit customer type
- `Payment Terms` when using credit customer type
- `Notes`
- `Active`

Customer types:
- `Regular`
- `Credit`
- `Wholesale`

### Create Partners
Open `Partners`, stay on the `Partners` tab, and click `Add Partner`.

Fill in:
- `Name`
- `Phone`
- `Email`
- `Address`
- `Notes`
- `Active`

### Setup Validation Checklist
Before going live, confirm:
- branches exist
- users are assigned correctly
- raw stock products exist
- production items exist
- recipes are linked to the right final products
- suppliers exist
- required customers exist
- required partners exist

## 4. Cashier Operations Guide

### Daily Work Sequence
Use this order every day:

1. Log in
2. Confirm branch
3. Open stock session
4. Record opening stock
5. Record incoming stock if needed
6. Record production runs if prepared items are made
7. Create sales
8. Record payment for unpaid sales
9. Record wastage or stock share if needed
10. Record closing stock
11. Close stock session

### Open A Stock Session
Open `Stock Session`.

If no session is open, use the `Open Stock Session` or `Open Session` action.

### Record Opening Stock
Inside the open session:
1. open the opening stock area
2. select the product
3. enter quantity
4. confirm the unit
5. save the entry

### Record Incoming Stock
Inside the open session:
1. open the incoming stock area
2. select the product
3. enter quantity
4. choose the supplier
5. save the entry

### Record Production
Inside the stock session, open the `Production` tab.

Click `Record production run`.

Fill in:
- `Recipe`
- `Actual output`
- `Wastage`
- actual ingredient quantities used
- `Notes`

Click `Save production run`.

### Create A Sale
Open `New Sale`.

First set:
- `Payment Method`
- `Customer` if needed

Then click `Add Item`.

For each item:
1. select the product
2. enter quantity or amount based on the prompt shown
3. confirm the price

Examples:
- soup may ask for number of cups
- mutura may ask for number of portions
- some items may ask for number of pieces

Submit the sale when complete.

### Record Payment
Open the sale details page.

If the sale is unpaid:
1. click `Record Payment`
2. choose the payment method
3. enter MPESA reference if needed
4. save

If the sale becomes paid, you can print the receipt.

### Record Wastage
Inside the stock session:
1. open the wastage area
2. choose the product
3. enter quantity
4. add the reason or notes
5. add photo evidence if required
6. save

### Record Stock Share
Open `Partners`, then open the `Stock Share` tab.

Click `Record Stock Share`.

Enter:
- partner
- product
- quantity
- unit
- notes

Save the stock share.

If the partner pays later, use `Mark paid`.

### Record Closing Stock
Inside the session:
1. open the closing stock area
2. count remaining stock
3. enter the correct quantities
4. save

### Close The Session
Before closing, confirm:
- sales are entered
- required payments are handled
- closing stock is recorded

Then use the close session action and confirm it.

## 5. SOP And Process Flows

### SOP: Open A Branch For The Day
1. Log in
2. Confirm branch
3. Open `Stock Session`
4. Open the day’s session
5. Confirm the session shows as open
6. Record opening stock

### SOP: Record Production
1. Open the current stock session
2. Open `Production`
3. Click `Record production run`
4. Select recipe
5. Enter actual output
6. Enter wastage if any
7. Confirm actual ingredient quantities
8. Save

### SOP: Create A Standard Sale
1. Open `New Sale`
2. Select payment method
3. Select customer if needed
4. Click `Add Item`
5. Select product
6. Enter quantity or amount
7. Confirm price
8. Submit sale

### SOP: Create A Wholesale Sale
1. Open `New Sale`
2. Select a wholesale customer
3. Confirm the wholesale notice appears
4. Add items
5. Confirm prices
6. Submit the sale

### SOP: Create A Credit Sale
1. Open `New Sale`
2. Set payment method to `Credit`
3. Select a credit customer
4. Add items
5. Submit sale

### SOP: Record Payment
1. Open sale details
2. Click `Record Payment`
3. Enter payment details
4. Save
5. Confirm the sale is paid

### SOP: Record Wastage
1. Open the current stock session
2. Open the wastage area
3. Select product
4. Enter quantity
5. Add reason
6. Add photo if needed
7. Save

### SOP: Close Session
1. Confirm sales are entered
2. Confirm payments are handled
3. Record closing stock
4. Confirm wastage and stock share records
5. Close the session

## 6. Reports Guide

### Before Reading Any Report
Set:
- `Start Date`
- `End Date`
- `Branch`

Use `Clear filters` when needed.

Use `Export Excel` when you want a spreadsheet copy.

### Sales Report
Shows:
- total sales
- total revenue
- unpaid amount
- paid sales
- sales by branch
- sales by product

Use it to review branch sales performance and unpaid balances.

### Stock Report
Shows:
- opening stock
- incoming stock
- closing stock
- wastage
- production use
- sales by value
- sales by quantity
- stock by branch

Use it to review stock movement and branch stock performance.

### Wastage Report
Shows:
- total wastage
- total entries
- products affected
- wastage by product

Use it to identify stock loss.

### Stock Share Report
Shows:
- total shared quantity
- partners involved
- products shared
- paid and unpaid stock share records

Use it to follow up partner obligations.

### Production Report
Shows:
- total runs
- expected output
- actual output
- sold quantity
- remaining quantity
- productivity
- sell-through
- wastage rate
- branch productivity table

Use it to compare prepared-item performance by branch.

### Weekly Report
Shows:
- current week sales
- current week revenue
- last week sales
- last week revenue
- sales change
- revenue change

Use it for quick management review.

## 7. Appendix

### Quick Answers

#### A Product Is Missing In Recipe Final Product
The product must already exist and must be set as a production item.

#### A Sale Uses The Wrong Prompt
The product sale mode or sales prompt is wrong and should be corrected.

#### A Sale Cannot Start
There may be no open stock session.

#### A Receipt Cannot Print
The sale is not yet paid.

#### A Session Cannot Close
Closing stock or payment requirements may still be incomplete.

### Admin Quick Setup Checklist
1. Create branches
2. Create users
3. Assign branch users
4. Create products
5. Create production items
6. Create recipes
7. Create suppliers
8. Create customers
9. Create partners
10. Test one session and one sale

### Cashier Quick Start Checklist
1. Log in
2. Confirm branch
3. Open stock session
4. Record opening stock
5. Confirm needed products exist
6. Start work

### End-Of-Day Checklist
1. Sales are entered
2. Payments are recorded
3. Wastage is recorded
4. Stock share is recorded if used
5. Closing stock is recorded
6. Session is closed

### Final Reminder
The system works best when records are created in order:

1. branch
2. user
3. product
4. recipe
5. session
6. sale
7. payment
