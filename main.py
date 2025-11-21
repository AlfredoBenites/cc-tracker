# typing = allows for specifying the types of variables
# List is used to return lists
from typing import Optional, List

# FastAPI = main class to create the API
# Depends = a tool FastAPI uses to "inject" things to endpoints (like giving an endpoint access to a database session)
from fastapi import FastAPI, Depends, HTTPException

# SQLModel = defines the tables/models
# Field = lets us configure columns (primary key, defaults, etc.)
# create_engine = creates the connection to a SQLite database
# Session = a DB session (used to run queries)
# select = a helper to build SELECT SQL queries
from sqlmodel import SQLModel, Field, create_engine, Session, select

# Allows React to access FastAPI
from fastapi.middleware.cors import CORSMiddleware

#region card reward rules
# ------------------------------------ Card Reward Rules ------------------------------------
CARD_RULES = {
    "Chase Freedom Unlimited": {
        "Chase Travel": 0.05,
        "Dining": 0.03,
        "Drugstores": 0.03,
        "Groceries": 0.015,
        "Amazon": 0.015,
        "Gas": 0.015,
        "Online Retail Purchases": 0.015,
        "Other": 0.015,          # base 1.5%
        "default": 0.015
    },
    "AMEX Blue Cash Everyday": {
        "Groceries": 0.03,
        "Gas": 0.03,
        "Online Retail Purchases": 0.03,
        "Amazon": 0.03,
        "Drugstores": 0.01,
        "Dining": 0.01,
        "Chase Travel": 0.01,
        "Other": 0.01,
        "default": 0.01
    },
    "Capital One Quicksilver": {
        "Amazon": 0.01,
        "Drugstores": 0.01,
        "Groceries": 0.01,
        "Gas": 0.01,
        "Online Retail Purchases": 0.01,
        "Dining": 0.01,
        "Chase Travel": 0.01,
        "Other": 0.01,
        "default": 0.01          # 1.5% on everything
    },
    "Discover it Student Cash Back": {
        "Amazon": 0.05,
        "Drugstores": 0.05,
        "Groceries": 0.01,
        "Gas": 0.01,
        "Online Retail Purchases": 0.01,
        "Dining": 0.01,
        "Chase Travel": 0.01,
        "Other": 0.01,
        "default": 0.01         # base 1% & 5% rotating
    }
}

def get_cashback_rate_for(card: str, category: str) -> float:
    card_rules = CARD_RULES.get(card)
    if not card_rules:
        return 0.0
    
    if category in card_rules:
        return card_rules[category]
    
    if "Other" in card_rules:
        return card_rules["Other"]
    
    if "default" in card_rules:
        return card_rules["default"]
    
    return 0.0

#endregion
# ------------------------------------ Database Setup ------------------------------------

# This is the "connection string" that tells SQLModel where the database is
# sqlite:/// = use SQLite
# .//cc_tracker.db = create/use the file cc_tracker.db in the current folder
sqlite_url = "sqlite:///./cc_tracker.db"

# The engine represents the connection to the database
# echo=True means: print SQL statement to the terminal (useful for debugging)
engine = create_engine(sqlite_url, echo=True)

#region transaction model
class Transaction(SQLModel, table=True):
    # This is the primary key for the table
    # Optional[int] means the id can be None before saving
    # Field(... primary_key=True) = auto-increment primary_key
    id: Optional[int] = Field(default=None, primary_key=True)

    # Core fields
    date: str
    merchant: str
    category: str
    card: str
    amount: float
    category: str
    notes:str
    who: str
    paid: bool = False
    cashback_rate: float = 0.0

# This model defines the data the client sends when creating a new transaction
# It does not inclue "id" because the database creates that
class TransactionCreate(SQLModel):
    date: str
    merchant: str
    category: str
    card: str
    amount: float
    category: str
    notes:str
    who: str
    paid: bool = False
    cashback_rate: float = 0.0

# This model defines the data for updating an existing transaction
# All fields are optional so that you can just send what you want to change
class TransactionUpdate(SQLModel):
    date: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    card: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    notes:Optional[str] = None
    who: Optional[str] = None
    paid: Optional[bool] = None
    cashback_rate: Optional[float] = None
#endregion

def create_db_and_tables():
    # Creates the table(s) in the database if they don't already exist
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session: # Creates a database session (like opening a connection)
        yield session #hands the session to FastAPI when needed

#region FastAPI App
# ------------------------------------ FastAPI App ------------------------------------
#endregion

app = FastAPI() #FastAPI application object

# Allows React to access FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup") #Called automatically when the app starts
def on_startup():
    create_db_and_tables()

@app.get("/") # Visiting http://localhost:8000/ shows this JSON
def read_root():
    return {"message": "Credit Card Tracker v1 is alive"}

#region show all transactions
@app.get("/transactions")
def list_transactions(
    who: Optional[str] = None,
    paid: Optional[bool] = None,
    card: Optional[str] = None,
    notes: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(Transaction) # Puts all the transactions onto query -- the bottom will narrow the transactions down

    # Adds filters if the user provides them
    if who:
        query = query.where(Transaction.who == who)

    if paid is not None:
        query = query.where(Transaction.paid == paid)

    if card:
        query = query.where(Transaction.card == card)

    if notes:
        query = query.where(Transaction.notes.contains(notes))

    # Runs the query
    transactions = session.exec(query).all()
    return transactions
#endregion

#region posting transaction
@app.post("/transactions")
def create_transaction(
    transaction: TransactionCreate,
    session: Session = Depends(get_session)
):
    # If cashback_rate is not set or 0 try to use the get_cashback_rate_for() to find the rate
    rate = transaction.cashback_rate or 0.0
    if rate == 0.0:
        rate = get_cashback_rate_for(transaction.card, transaction.category)
        transaction.cashback_rate = rate

    # Turning the input model into a real database model
    tx = Transaction.from_orm(transaction)

    #Add to database
    session.add(tx)
    session.commit()
    session.refresh(tx) # refresh so tx.id gets filled

    return tx
#endregion

#region delete transaction
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    # Getting the transaction with this id from the database
    tx = session.get(Transaction, transaction_id)

    # If the transaction doesn't exist, return a 404 error
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If it exists, delete it from the session
    session.delete(tx)

    # Save changes to the database
    session.commit()

    #returning a simple confirmation message
    return {"status": "deleted", "id": transaction_id}

#endregion

#region update transaction
@app.patch("/transactions/{transaction_id}")
def update_transaction(
    transaction_id:int,
    transaction_update: TransactionUpdate,
    session: Session = Depends(get_session)
):
    # Getting the transaction from the database
    tx = session.get(Transaction, transaction_id)

    # Return 404 if it doesn't exist
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Only get the fields that were sent in the request
    update_data = transaction_update.dict(exclude_unset=True)

    # Updating each field on the transaction
    for key, value in update_data.items():
        setattr(tx, key, value)

    # Saving the changes
    session.add(tx)
    session.commit()
    session.refresh(tx)

    # Returning the updated transaction
    return tx
#endregion

#region overall summary
@app.get("/summary/overall")
def overall_summary(session: Session = Depends(get_session)):
    # Gets all the transactions from the database
    transactions = session.exec(select(Transaction)).all()

    # Overall totals 
    total_spent = sum(t.amount for t in transactions)
    total_cashback = sum(t.amount * t.cashback_rate for t in transactions)

    total_paid = sum(t.amount for t in transactions if t.paid)
    total_unpaid = total_spent - total_paid

    # Dynamic break down of summary per person
    per_person = {}
    for t in transactions:
        person = t.who

        if person not in per_person:
            per_person[person] = {
                "total": 0.0,
                "paid": 0.0,
                "owes": 0.0,
                "cashback_earned": 0.0,
                "cashback_pending": 0.0,
            }
        
        per_person[person]["total"] += t.amount
        per_person[person]["cashback_earned"] += t.amount * t.cashback_rate

        if t.paid:
            per_person[person]["paid"] += t.amount
        else:
            per_person[person]["owes"] += t.amount

    # Rounding helper function
    def r(value: float) -> float:
        return round(value, 2)    
        
    # Rounding everyone's numbers
    for person, data in per_person.items():
        for key in data:
            data[key] = r(data[key])

    # Returns every total and then the details of each person
    return {
        "total_spent": r(total_spent),
        "total_paid": r(total_paid),
        "total_unpaid": r(total_unpaid),
        "total_cashback": r(total_cashback),
        "per_person": per_person
    }
#endregion

#region summary by card
@app.get("/summary/by-card")
def summary_by_card(session: Session = Depends(get_session)):
    # Getting all transactions from the database
    transactions = session.exec(select(Transaction)).all()

    summary = {} # dictionary for the summaries

    for t in transactions:
        card_name = t.card
        person = t.who

        # Defaulting every card if it's not in summary{}
        if card_name not in summary:
            summary[card_name] = {
                "total": 0.0,
                "paid": 0.0,
                "unpaid": 0.0,
                "cashback_earned": 0.0,
                "cashback_pending": 0.0,
                "per_person": {}
            }

        card_summary = summary[card_name] # Getting the inner dictionary of the card

        # Adding the total spend to this card
        card_summary["total"] += t.amount

        # Updating paid & unpaid based on if the transaction was paid or not
        if t.paid:
            card_summary["paid"] += t.amount
        else:
            card_summary["unpaid"] += t.amount

        # Cashback/points for this transaction
        transaction_cashback = t.amount * t.cashback_rate

        if t.paid:
            card_summary["cashback_earned"] += transaction_cashback
        else:
            card_summary["cashback_pending"] += transaction_cashback

        # Updating info on who made this transaction
        if person not in card_summary["per_person"]:
            card_summary["per_person"][person] = {
                "total": 0.0,
                "paid": 0.0,
                "owes": 0.0,
                "cashback_earned": 0.0,
                "cashback_pending": 0.0,
            }
        
        p_data = card_summary["per_person"][person]
        p_data["total"] += t.amount
        if t.paid:
            p_data["paid"] += t.amount
            p_data["cashback_earned"] += transaction_cashback
        else:
            p_data["owes"] += t.amount
            p_data["cashback_pending"] += transaction_cashback

        # Helper function to round all numbers to 2 decimals
        def r(value: float) -> float:
            return round(value, 2)
        
        for card_name, data in summary.items():
            data["total"] = r(data["total"])
            data["paid"] = r(data["paid"])
            data["unpaid"] = r(data["unpaid"])
            data["cashback_earned"] = r(data["cashback_earned"])
            data["cashback_pending"] = r(data["cashback_pending"])

            for person, p_data in data["per_person"].items(): # Goes through each person and their data (total, paid, owes)
                for key in p_data: 
                    p_data[key] = r(p_data[key]) # updates each value to 2 decimals
        
    return summary
#endregion