//contact form 

CREATE TABLE contact(
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email TEXT NOT NULL,
	message TEXT NOT NULL,
	created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	
)

-- Create the table for storing emergency ambulance service requests
CREATE TABLE emergency_ambulance_requests (
    request_id SERIAL PRIMARY KEY,         -- Automatically generated Request ID
    patient_name VARCHAR(100) NOT NULL,    -- Patient Name
    contact_number VARCHAR(15) NOT NULL,   -- Contact Number
    request_time TIMESTAMP NOT NULL,       -- Date and Time of Request
    location TEXT NOT NULL,                -- Location
    condition TEXT NOT NULL,               -- Brief description of the patient's condition
    status VARCHAR(50) DEFAULT 'Pending'   -- Status of the request, defaults to 'Pending'
);


