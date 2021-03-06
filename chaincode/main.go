package main

import (
	"fmt"
	"bytes"
	"time"
	"encoding/json"
	"encoding/hex"
	"crypto/rand"
	"io"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
	"golang.org/x/crypto/nacl/box"
)

type Record struct {
	User string `json:"user"`						// Record Owner Public Key
	Organization string `json:"organization"`		// Signing entity Public Key
	Status string `json:"status`					// Status of the record - if signed
	Hash string `json:"hash"`						// Hash of the private content of the record
	Data string `json:"data"`						// Public data
	//CreationTime time.Time `json:"creation_time"` // Time when record was created
}

// Each record should be unique - Match hash if record already exists

type GovernmentRecord struct {
	Aadhar string `json:"aadhar"`
	Pan string `json:"pan"`
}

type EducationRecord struct {
	StartDate time.Time `json:"start_date"`
	EndDate time.Time `json:"end_date"`
	Grade int `json:"grade"`
}

type CompanyRecord struct {
	StartDate time.Time `json:"start_date"`
	EndDate time.Time `json:"end_date`
	Role string `json:"role"`
	Details string `json:"details"`
	Salary int `json:"details"`
}

type user struct {
	PublicKey string `json:"public_key"`
	Username string `json:"username"`
	Password string `json:"password"`
	RecordIndex []Record `json:"record"`
	Profile string `json:"profile"`
}

type organization struct {
	PublicKey string `json:"public_key"`
	OrgName string `json:"organization_name"`
	Password string `json:"password"`
	RecordIndex []string `json:"records"`
	Profile string `json:"profile"`
}

type Payment struct {
	From string `json:"from"`
	To string `json:"to"`
	Amount int `json:"amount"`
}

type RecordAccess struct {
	Data string `json:"data"`
	Status string `json:"status"`
}

type PeoplechainChaincode struct {
}

func (s *PeoplechainChaincode) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

func (s *PeoplechainChaincode) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {
	function, args := APIstub.GetFunctionAndParameters()
	if function == "createRecord" {
		return s.createRecord(APIstub, args)
	} else if function == "queryRecord" {
		return s.queryRecord(APIstub, args)
	} else if function == "queryAllRecord" {
		return s.queryAllRecord(APIstub)
	} else if function == "createUser" {
		return s.createUser(APIstub, args)
	} else if function == "createOrganization" {
		return s.createOrganization(APIstub, args)
	} else if function == "verifyRecord" {
		return s.verifyRecord(APIstub, args)
	} else if function == "signRecord" {
		return s.signRecord(APIstub, args)
	} else if function == "decryptRecord" {
		return s.decryptRecord(APIstub, args)
	} else if function == "declineRecord" {
		return s.declineRecord(APIstub, args)
	} else if function == "requestAccess" {
		return s.requestAccess(APIstub, args)
	} else if function == "grantAccess" {
		return s.grantAccess(APIstub, args)
	} else if function == "revokeAccess" {
		return s.revokeAccess(APIstub, args)
	} else if function == "getUserData" {
		return s.getUserData(APIstub, args)
	} else if function == "getOrgsData" {
		return s.getOrgsData(APIstub, args)
	} else if function == "decryptRecordAccess" {
		return s.decryptRecordAccess(APIstub, args)
	} else if function == "getBalance" {
		return s.getBalance(APIstub, args)
	} else if function == "getRecordAccess" {
		return s.getRecordAccess(APIstub, args)
	} else if function == "updateProfile" {
		return s.updateProfile(APIstub, args)
	} else if function == "updateOrganizationProfile" {
		return s.updateOrganizationProfile(APIstub, args)
	} else if function == "getAllRecordAccess" {
		return s.getAllRecordAccess(APIstub)
	} else if function == "getAllOrgs" {
		return s.getAllOrgs(APIstub)
	} else if function == "getAllUsers" {
		return s.getAllUsers(APIstub)
	}

	return shim.Error("Invalid function name")
}

func (s *PeoplechainChaincode) createRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 6 {
		return shim.Error("Incorrect number of arguments, expecting 6")
	}

	// arguments - key, userPublicKey, userPrivateKey, orgPublicKey, private_Date, public_Data

	var nonce [24]byte
	if _, err := io.ReadFull(rand.Reader, nonce[:]);  err != nil {
		panic(err)
	}

	userPrivateKeyByte, _ := hex.DecodeString(args[2])
	orgPublicKeyByte, _ := hex.DecodeString(args[3])

	var key1, key2 [32]byte
	copy(key1[:], userPrivateKeyByte)
	copy(key2[:], orgPublicKeyByte)

	msg := []byte(args[4])
	encrypted := box.Seal(nonce[:], msg, &nonce, &key2, &key1)
	hash := hex.EncodeToString(encrypted[:])

	var record = Record { User: args[1], Organization: args[3], Status: "PENDING",	Hash: hash, Data: args[4]  }

	recordAsBytes, _ := json.Marshal(record)

	err1 := APIstub.PutState(args[0], recordAsBytes)
	if err1 != nil {
		return shim.Error(fmt.Sprintf("Failed to create record: %s", args[0]))
	}
	attributes := []string{args[5]}
	key, _ := APIstub.CreateCompositeKey("user", attributes)
	userAsByte, _ := APIstub.GetState(key)

	if userAsByte == nil {
		return shim.Error("Could not locate user")
	}

	user_1 := user{}
	json.Unmarshal(userAsByte, &user_1)

	user_1.RecordIndex = append(user_1.RecordIndex, record)

	userAsBytes, _ := json.Marshal(user_1)
	err4 := APIstub.PutState(key, userAsBytes)

	if err4 != nil {
		return shim.Error("Failed to update User Record Index")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) queryRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1{
		return shim.Error("Incorrect number of arguments, expecting 1")
	}

	recordAsBytes, _ := APIstub.GetState(args[0])
	if recordAsBytes == nil {
		return shim.Error("Could not find record")
	}

	return shim.Success(recordAsBytes)
}

func (s *PeoplechainChaincode) queryAllRecord(APIstub shim.ChaincodeStubInterface) sc.Response {

	startKey := "0"
	endKey := "999"

	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}

		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllRecord:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (s *PeoplechainChaincode) createUser(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, expecting 2")
	}

	reader := rand.Reader
	userPublicKey, userPrivateKey, err := box.GenerateKey(reader)
	if err != nil {
		panic(err)
	}

	userPublicKeyHex := hex.EncodeToString(userPublicKey[:])

	username := args[0]
	attributes := []string{username}
	index_list := []Record{}
	key, _ := APIstub.CreateCompositeKey("user", attributes)
	user_object := user{PublicKey: userPublicKeyHex, Username: args[0], Password: args[1],  RecordIndex: index_list, Profile: "NULL"}
	userPrivateKeyHex := hex.EncodeToString(userPrivateKey[:])

	userAsByte, _ := json.Marshal(user_object)
	err2 := APIstub.PutState(key, userAsByte)
	if err2 != nil {
		return shim.Error(fmt.Sprintf("Failed to create user: %s", key))
	}

	key_pair := map[string]string{
		"pubkey": userPublicKeyHex,
		"privkey": userPrivateKeyHex,
	}

	keyByte, _ := json.Marshal(key_pair)

	return shim.Success(keyByte)
}

func (s *PeoplechainChaincode) updateProfile(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, expecting 2");
	}

	username := args[0]
	attributes := []string{username}
	key, _ := APIstub.CreateCompositeKey("user", attributes)

	userAsByte, _ := APIstub.GetState(key)

	if userAsByte == nil {
		return shim.Error("Could not locate user")
	}

	user_1 := user{}
	json.Unmarshal(userAsByte, &user_1)

	user_1.Profile = args[1]

	userAsBytes, _ := json.Marshal(user_1)
	err4 := APIstub.PutState(key, userAsBytes)

	if err4 != nil {
		return shim.Error("Failed to update User Profile")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) updateOrganizationProfile(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, expecting 2");
	}

	orgpublicKey := args[0]
	attributes := []string{orgpublicKey}
	key, _ := APIstub.CreateCompositeKey("Organization", attributes)

	orgByte, _ := APIstub.GetState(key)

	if orgByte == nil {
		return shim.Error("Could not locate user")
	}

	user_1 := user{}
	json.Unmarshal(orgByte, &user_1)

	user_1.Profile = args[1]

	userAsBytes, _ := json.Marshal(user_1)
	err4 := APIstub.PutState(key, userAsBytes)

	if err4 != nil {
		return shim.Error("Failed to update User Profile")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) createOrganization(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, expecting 2")
	}

	reader := rand.Reader
	organizationPublicKey, organizationPrivateKey, err := box.GenerateKey(reader)
	if err != nil {
		panic(err)
	}

	organizationPublicKeyHex := hex.EncodeToString(organizationPublicKey[:])
	organizationPrivateKeyHex := hex.EncodeToString(organizationPrivateKey[:])
	attributesOrg := []string{organizationPublicKeyHex}
	index_list := []string{}
	keyOrg, _ := APIstub.CreateCompositeKey("Organization", attributesOrg)
	
	org_object := organization{PublicKey: organizationPublicKeyHex, OrgName: args[0], Password: args[1], RecordIndex: index_list, Profile: "NULL"}

	orgAsByte, _ := json.Marshal(org_object)
	err3 := APIstub.PutState(keyOrg, orgAsByte)
	if err3 != nil {
		return shim.Error(fmt.Sprintf("Failed to create organization: %s", keyOrg))
	}

	key_pair := map[string]string{
		"pubkey": organizationPublicKeyHex,
		"privkey": organizationPrivateKeyHex,
		"organization": args[0],
		"Key": keyOrg,
	}

	keyByte, _ := json.Marshal(key_pair)

	return shim.Success(keyByte)
}

func (s *PeoplechainChaincode) verifyRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments, expecting 1")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) signRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect numberof arguments, expecting 1")
	}

	recordAsByte, _ := APIstub.GetState(args[0])
	if recordAsByte == nil {
		return shim.Error("Record not found")
	}

	record := Record{}
	json.Unmarshal(recordAsByte, &record)

	record.Status = "SIGNED"
	recordAsBytes, _ := json.Marshal(record)

	err := APIstub.PutState(args[0], recordAsBytes)

	if err != nil {
		return shim.Error("Unable to sign record")
	}

	payment := Payment{ From: record.User, To: record.Organization, Amount: 50}
	paymentAsByte, _ := json.Marshal(payment)

	paymentAttr := []string{payment.To, payment.From}
	payKey, _ := APIstub.CreateCompositeKey("payment", paymentAttr)

	err1 := APIstub.PutState(payKey, paymentAsByte)

	if err1 != nil {
		return shim.Error("Unable to create payment record")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) declineRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
			return shim.Error("Incorrect number of arguments, expecting 1")
	}

	recordAsByte, _ := APIstub.GetState(args[0])
	if recordAsByte == nil {
		return shim.Error("Record not found")
	}

	record := Record{}
	json.Unmarshal(recordAsByte, &record)

	record.Status = "DECLINED"
	recordAsBytes, _ := json.Marshal(record)

	err := APIstub.PutState(args[0], recordAsBytes)

	if err != nil {
		return shim.Error("Unable to sign record")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) decryptRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, expecting 2")
	}

	recordAsByte, _ := APIstub.GetState(args[0])
	if recordAsByte == nil {
		return shim.Error("Record not found")
	}
	record := Record{}
	json.Unmarshal(recordAsByte, &record)

	hash := record.Hash
	var decryptNonce [24]byte

	hashByte, _ := hex.DecodeString(hash)
	copy(decryptNonce[:], hashByte[:24])

	var key1, key2 [32]byte
	key1Byte, _ := hex.DecodeString(record.User)
	key2Byte, _ := hex.DecodeString(args[1])

	copy(key1[:], key1Byte)
	copy(key2[:], key2Byte)

	decrypted, ok := box.Open(nil, hashByte[24:], &decryptNonce, &key1, &key2)
	if !ok {
		return shim.Error("Failed to decrypt")
	}
	data := []byte(decrypted)
	return shim.Success(data)
}

func (s *PeoplechainChaincode) requestAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments")
	}

	recordAsByte, _ := APIstub.GetState(args[0])
	if recordAsByte == nil {
		return shim.Error("Record Not Found")
	}

	recordAccess := RecordAccess{  Data: "ENCRYPTED", Status: "PENDING"}
	recordAccessAsByte, _ := json.Marshal(recordAccess)
	attributes := []string{args[1], args[0]}
	key, _ := APIstub.CreateCompositeKey("ra", attributes)
	err := APIstub.PutState(key, recordAccessAsByte)

	if err != nil {
		return shim.Error("Unable to request access")
	}

	return shim.Success(nil)
}

/* func (s *PeoplechainChaincode) grantAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments")
	}

	var nonce [24]byte
	if _, err := io.ReadFull(rand.Reader, nonce[:]);  err != nil {
		panic(err)
	}

	attributes := []string{args[0], args[1]}
	key, _ := APIstub.CreateCompositeKey("ra", attributes)
	recordAccessAsByte, errAccess := APIstub.GetState(key)

	if errAccess != nil {
		return shim.Error("RecordAccess file not found.")
	}

	recordAccess := RecordAccess{}
	json.Unmarshal(recordAccessAsByte, &recordAccess)

	recordAccess.Status = "GRANTED"

	userPrivKeyByte, _ := hex.DecodeString(args[3])
	orgPubKeyByte, _ := hex.DecodeString(args[1])

	var key1, key2 [32]byte

	copy(key1[:], userPrivKeyByte)
	copy(key2[:], orgPubKeyByte)

	msg := []byte(args[2])
	encrypted := box.Seal(nonce[:], msg, &nonce, &key2, &key1)
	hash := hex.EncodeToString(encrypted[:])

	recordAccess.Data = hash

	recordAccessAsBytes, _ := json.Marshal(recordAccess)

	err1 := APIstub.PutState(key, recordAccessAsBytes)
	if err1 != nil {
		return shim.Error(fmt.Sprintf("Failed to grant record access: %s", err1))
	}

	return shim.Success(nil);

} */

func (s *PeoplechainChaincode) grantAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments")
	}

	attributes := []string{args[0], args[1]}
	key, _ := APIstub.CreateCompositeKey("ra", attributes)
	recordAccessAsByte, errAccess := APIstub.GetState(key)

	if errAccess != nil {
		return shim.Error("RecordAccess file not found.")
	}

	recordAccess := RecordAccess{}
	json.Unmarshal(recordAccessAsByte, &recordAccess)

	recordAccess.Status = "GRANTED"

	recAsBytes, _ := APIstub.GetState(args[1])
	if recAsBytes == nil {
		return shim.Error("Could not find record")
	}

	rec := Record{}
	json.Unmarshal(recAsBytes, &rec)

	recordAccess.Data = rec.Data

	recordAccessAsBytes, _ := json.Marshal(recordAccess)

	err1 := APIstub.PutState(key, recordAccessAsBytes)
	if err1 != nil {
		return shim.Error(fmt.Sprintf("Failed to grant record access: %s", err1))
	}

	return shim.Success(nil);

}

func (s *PeoplechainChaincode) revokeAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments")
	}

	attributes := []string{args[0], args[1]}
	key, _ := APIstub.CreateCompositeKey("ra", attributes)
	recordAccessAsByte, _ := APIstub.GetState(key)

	recordAccess := RecordAccess{}
	json.Unmarshal(recordAccessAsByte, &recordAccess)

	recordAccess.Status = "DECLINED"
	recordAccess.Data = "NULL"

	recordAccessAsBytes, _ := json.Marshal(recordAccess)

	err := APIstub.PutState(key, recordAccessAsBytes)

	if err != nil {
		return shim.Error("Failed to grant access")
	}

	return shim.Success(nil)
}

func (s *PeoplechainChaincode) decryptRecordAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments")
	}

	attributes := []string{args[0], args[1]}
	key, _ := APIstub.CreateCompositeKey("ra", attributes)
	recordAccessAsByte, errAccess := APIstub.GetState(key)

	if errAccess != nil {
		return shim.Error("Failed to locate RecordAccess")
	}

	recordAccess := RecordAccess{}
	err := json.Unmarshal(recordAccessAsByte, &recordAccess)

	if err != nil {
		return shim.Error("Unmarshal error")
	}

	hash := recordAccess.Data
	var decryptNonce [24]byte

	hashByte, decodeError := hex.DecodeString(hash)
	if decodeError != nil {
		return shim.Error("Failed to decode hash or hash does not exists.")
	}
	copy(decryptNonce[:], hashByte[:24])

	var key1, key2 [32]byte
	key1Byte, _ := hex.DecodeString(args[3])
	key2Byte, _ := hex.DecodeString(args[2])

	copy(key1[:], key1Byte)
	copy(key2[:], key2Byte)

	decrypted, ok := box.Open(nil, hashByte[24:], &decryptNonce, &key1, &key2)
	if !ok {
		return shim.Error("Failed to decrypt")
	}

	data := []byte(decrypted)
	return shim.Success(data)

}

func (s *PeoplechainChaincode) getUserData(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1{
		return shim.Error("Incorrect number of arguments, expecting 1");
	}

	attributes := []string{args[0]}
	key, _ := APIstub.CreateCompositeKey("user", attributes)

	userAsByte, _ := APIstub.GetState(key);

	if userAsByte == nil {
		return shim.Error("Could not locate user");
	}

	return shim.Success(userAsByte);
}

func (s *PeoplechainChaincode) getOrgsData(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1{
		return shim.Error("Incorrect number of arguments, expecting 1");
	}

	attributes1 := []string{args[0]}
	key1, _ := APIstub.CreateCompositeKey("Organization", attributes1)

	orgAsByte1, _ := APIstub.GetState(key1);

	if orgAsByte1 == nil {
		return shim.Error("Could not locate organization");
	}

	return shim.Success(orgAsByte1);
}

func (s *PeoplechainChaincode) getBalance(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments")
	}

	balance := 1000

	resultsIterator, err := APIstub.GetStateByPartialCompositeKey("payment",[]string{})
	if err != nil {
		return shim.Error(err.Error())
	}

	defer resultsIterator.Close()

	counter := 0
	for ;;resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		payment := Payment{}
		json.Unmarshal(queryResponse.Value, payment)

		if payment.To == args[0] {
			balance += payment.Amount
		} else if payment.From == args[0] {
			balance -= payment.Amount
		}

		counter += 1
	}

	response := map[string]int{
		"Balance": balance,
		"Counter": counter,
	}

	responseByte, _ := json.Marshal(response)

	return shim.Success(responseByte)
}

func (s *PeoplechainChaincode) getRecordAccess(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments")
	}

	/* attributes := []string{args[0], []string{}}
	key, _ := APIstub.CreateCompositeKey("ra", attributes) */

	org := args[0]

	recordAccessIterator, parError := APIstub.GetStateByPartialCompositeKey("ra", []string{org})
	if parError != nil {
		return shim.Error(parError.Error())
	}

	defer recordAccessIterator.Close()
	
	var accessBuffer bytes.Buffer
	accessBuffer.WriteString("[")

	cArrayMemberAlreadyWritten := false
	for recordAccessIterator.HasNext() {
		accessQueryResponse, accessErr := recordAccessIterator.Next()
		if accessErr != nil {
			return shim.Error(accessErr.Error())
		}

		if cArrayMemberAlreadyWritten == true {
			accessBuffer.WriteString(",")
		}

		accessBuffer.WriteString("{\"Key\":")
		accessBuffer.WriteString("\"")
		_, keyComp, compError := APIstub.SplitCompositeKey(accessQueryResponse.Key)
		if compError != nil {
			return shim.Error(parError.Error())
		}
		accessBuffer.WriteString(keyComp[0] + "-" + keyComp[1])
		accessBuffer.WriteString("\"")

		accessBuffer.WriteString(", \"Access\":")
		accessBuffer.WriteString(string(accessQueryResponse.Value))
		accessBuffer.WriteString("}")
		cArrayMemberAlreadyWritten = true
	}
	accessBuffer.WriteString("]")

	fmt.Printf(" -queryAllAccess:\n%s\n", accessBuffer.String())

	return shim.Success(accessBuffer.Bytes())
}

func (s *PeoplechainChaincode) getAllRecordAccess(APIstub shim.ChaincodeStubInterface) sc.Response {

	/* attributes := []string{args[0], []string{}}
	key, _ := APIstub.CreateCompositeKey("ra", attributes) */

	recordAccessIterator1, parError1 := APIstub.GetStateByPartialCompositeKey("ra", []string{})
	if parError1 != nil {
		return shim.Error(parError1.Error())
	}

	defer recordAccessIterator1.Close()
	
	var accessBuffer1 bytes.Buffer
	accessBuffer1.WriteString("[")

	cArrayMemberAlreadyWritten1 := false
	for recordAccessIterator1.HasNext() {
		accessQueryResponse1, accessErr1 := recordAccessIterator1.Next()
		if accessErr1 != nil {
			return shim.Error(accessErr1.Error())
		}

		if cArrayMemberAlreadyWritten1 == true {
			accessBuffer1.WriteString(",")
		}

		accessBuffer1.WriteString("{\"Key\":")
		accessBuffer1.WriteString("\"")
		_, keyComp1, compError1 := APIstub.SplitCompositeKey(accessQueryResponse1.Key)
		if compError1 != nil {
			return shim.Error(compError1.Error())
		}
		accessBuffer1.WriteString(keyComp1[0] + "-" + keyComp1[1])
		accessBuffer1.WriteString("\"")

		accessBuffer1.WriteString(", \"Access\":")
		accessBuffer1.WriteString(string(accessQueryResponse1.Value))
		accessBuffer1.WriteString("}")
		cArrayMemberAlreadyWritten1 = true
	}
	accessBuffer1.WriteString("]")

	fmt.Printf(" -queryAllAccess:\n%s\n", accessBuffer1.String())

	return shim.Success(accessBuffer1.Bytes())
}

func (s *PeoplechainChaincode) getAllOrgs(APIstub shim.ChaincodeStubInterface) sc.Response {
	
	allOrgsIterator, orgError := APIstub.GetStateByPartialCompositeKey("Organization", []string{})
	if orgError != nil {
		return shim.Error(orgError.Error())
	}
	
	defer allOrgsIterator.Close()

	var orgsBuffer bytes.Buffer
	orgsBuffer.WriteString("[")

	orgsArrayMemberAlreadyWritten := false
	for allOrgsIterator.HasNext() {
		orgsQueryResponse, orgError1 := allOrgsIterator.Next()
		if orgError1 != nil {
			return shim.Error(orgError1.Error())
		}

		if orgsArrayMemberAlreadyWritten == true {
			orgsBuffer.WriteString(",")
		}

		orgsBuffer.WriteString("{\"Org\":")
		orgsBuffer.WriteString("\"")
		_, orgKeyComp, orgKeyCompError := APIstub.SplitCompositeKey(orgsQueryResponse.Key)
		if orgKeyCompError != nil {
			return shim.Error(orgKeyCompError.Error())
		}

		orgsBuffer.WriteString(orgKeyComp[0])
		orgsBuffer.WriteString("\"")

		orgsBuffer.WriteString(", \"Details\":")
		orgsBuffer.WriteString(string(orgsQueryResponse.Value))
		orgsBuffer.WriteString("}")
		orgsArrayMemberAlreadyWritten = true
	}

	orgsBuffer.WriteString("]")

	fmt.Printf(" - allOrgs:\n%s\n", orgsBuffer.String())

	return shim.Success(orgsBuffer.Bytes())
}

func (s *PeoplechainChaincode) getAllUsers(APIstub shim.ChaincodeStubInterface) sc.Response {
	
	allUserIterator, orgError := APIstub.GetStateByPartialCompositeKey("user", []string{})
	if orgError != nil {
		return shim.Error(orgError.Error())
	}
	
	defer allUserIterator.Close()

	var UserBuffer bytes.Buffer
	UserBuffer.WriteString("[")

	UserArrayMemberAlreadyWritten := false
	for allUserIterator.HasNext() {
		UserQueryResponse, orgError1 := allUserIterator.Next()
		if orgError1 != nil {
			return shim.Error(orgError1.Error())
		}

		if UserArrayMemberAlreadyWritten == true {
			UserBuffer.WriteString(",")
		}

		UserBuffer.WriteString("{\"Org\":")
		UserBuffer.WriteString("\"")
		_, orgKeyComp, orgKeyCompError := APIstub.SplitCompositeKey(UserQueryResponse.Key)
		if orgKeyCompError != nil {
			return shim.Error(orgKeyCompError.Error())
		}

		UserBuffer.WriteString(orgKeyComp[0])
		UserBuffer.WriteString("\"")

		UserBuffer.WriteString(", \"Details\":")
		UserBuffer.WriteString(string(UserQueryResponse.Value))
		UserBuffer.WriteString("}")
		UserArrayMemberAlreadyWritten = true
	}

	UserBuffer.WriteString("]")

	fmt.Printf(" - allUser:\n%s\n", UserBuffer.String())

	return shim.Success(UserBuffer.Bytes())
}



func main() {
	err := shim.Start(new(PeoplechainChaincode))
	if err != nil {
		fmt.Printf("Error starting Peoplechain chaincode: %s", err)
	}
}
