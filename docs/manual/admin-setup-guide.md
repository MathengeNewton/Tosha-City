# 3. Admin Setup Guide

## Purpose
This section shows the correct order for setting up the application so staff can begin using it without confusion.

## Intended Audience
- Admin users

## Setup Order
Follow this order:

1. Create branches
2. Create users and assign branches
3. Create products
4. Create recipes
5. Create suppliers
6. Create customers
7. Create partners
8. Confirm cashier access and branch assignment

Do not skip the order above. Products must exist before recipes can be completed correctly.

## Step 1: Create Branches

### Open This Page
Open the `Branches` page.

### Click
Click `Add Branch`.

### Fill In
- `Name`
- `Code`
- `Type`
- `Active`

### Recommended Use
- Use a clear branch name
- Use a short code that staff can recognize quickly
- Choose the correct type:
  - `General butchery`
  - `Pork butchery`

### Save
Click `Save`.

### Expected Result
The branch should appear in the branch list with:
- name
- code
- type
- status

## Step 2: Create Users And Assign Branches

### Open This Page
Open the `Users Management` page.

### Click
Click `Create User`.

### Fill In
- `Username`
- `Email`
- `Password`
- `Role`
- `Branch`

### Important Rule
Non-admin users must be assigned to a branch.

### Recommended Practice
- Create cashier accounts with the cashier role only
- Give each cashier the branch where they will work
- Use admin accounts only for management and oversight

### Save
Click `Save`.

### Expected Result
The user should appear in the user list with:
- username
- email
- role
- branch

## Step 3: Create Products

### Open This Page
Open `Products Management`.

### Click
Click `Add Product`.

### Fill In The Main Fields
- `Name`
- `Unit`
- `Retail price`
- `Wholesale price`
- `Category`
- `Sale Mode`
- `Sales Prompt` if needed
- `Active`

### Understand Product Category
- `Raw stock`: items such as meat, bones, or other stock items
- `Production item`: items produced from recipes and later sold
- `Consumable`: support items used in operations

### Understand Sale Mode
- `Weight`
- `Portion`
- `Cup`
- `Piece`

### Examples
- Beef: raw stock, weight
- Mutura: production item, portion
- Bone soup: production item, cup
- Pork fry: production item, piece or portion depending on business choice

### Important Rule
If you want a product to appear as the final product inside a recipe, create it as a `Production item`.

### Save
Click `Create` or `Update`.

### Expected Result
The product appears in the product list with:
- category
- sale mode
- retail price
- wholesale price
- status

## Step 4: Create Recipes

### Open This Page
Open `Recipes`.

### Click
Click `Add Recipe`.

### Fill In The Main Fields
- `Recipe Name`
- `Branch Scope`
- `Finished Product`
- `Expected Output`
- `Unit`

### Finished Product Rule
The finished product must already exist in products and must be set up as a `Production item`.

### Add Ingredients
For each ingredient:
- choose `Linked Product` if the ingredient already exists as a product
- or leave linked product empty and type a free-text ingredient name
- enter `Ingredient Name`
- enter `Estimated Qty`
- enter `Unit`

### Add Notes
Use notes for special preparation instructions if needed.

### Save
Click `Save Recipe`.

### Expected Result
The recipe appears in the recipes list with:
- recipe name
- finished product
- branch scope
- expected output
- number of ingredients

## Step 5: Create Suppliers

### Open This Page
Open `Suppliers`.

### Click
Click `Add Supplier`.

### Fill In
- `Name`
- `Contact Person`
- `Phone`
- `Email`
- `Address`
- `Notes`
- `Active`

### Save
Click `Create`.

### Expected Result
The supplier appears in the suppliers list and can be selected during incoming stock entry.

## Step 6: Create Customers

### Open This Page
Open `Customers`.

### Click
Click `Add Customer`.

### Fill In
- `Name`
- `Phone`
- `Email`
- `Address`
- `Customer Type`
- `Credit Limit` when using credit customer type
- `Payment Terms` when using credit customer type
- `Notes`
- `Active`

### Customer Type Use
- `Regular`: normal sales
- `Credit`: customer can be selected for credit sales
- `Wholesale`: customer triggers wholesale pricing during sales

### Save
Click `Create`.

### Expected Result
The customer appears in the correct customer tab and can be selected during sales.

## Step 7: Create Partners

### Open This Page
Open `Partners`.

### Click
In the `Partners` tab, click `Add Partner`.

### Fill In
- `Name`
- `Phone`
- `Email`
- `Address`
- `Notes`
- `Active`

### Save
Click `Create`.

### Expected Result
The partner appears in the partner list and can later be used for stock share records.

## Step 8: Validate The Setup

### Check These Before Going Live
- branches exist
- each cashier has the correct branch
- raw stock products exist
- production items exist
- recipes are linked to the right finished products
- at least one supplier exists
- required customers exist
- required partners exist

## Suggested First-Day Checklist
Before handing the system to cashiers:

1. Log in as admin
2. Confirm branches are active
3. Confirm cashier accounts are active and branch-assigned
4. Confirm products have correct prices and sale modes
5. Confirm recipes have the right finished products
6. Confirm customers for credit and wholesale use
7. Confirm suppliers for incoming stock
8. Confirm partners if stock sharing is used

## Common Setup Mistakes

### Recipe Final Product Not Showing
Cause:
- the product was not created as a `Production item`

Fix:
- edit or recreate the product with category `Production item`

### Cashier Cannot Work In A Branch
Cause:
- the user has no branch assigned

Fix:
- edit the user and assign the branch

### Prepared Item Uses The Wrong Prompt In Sales
Cause:
- the product sale mode is wrong

Fix:
- edit the product and choose the correct sale mode or sales prompt
