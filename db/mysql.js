const mysql = require('mysql2/promise');
const config = require('../config.json');
    
    const getPool = (() => {
        let pool;
        return async () => {
            if (!pool) {
                console.debug("creating pool object");
                pool = mysql.createPool({
                    host: config.host,
                    user: config.user,
                    password: config.password,
                    database: config.database,
                    waitForConnections: true,
                    connectionLimit: 25,
                    queueLimit: 0,
                    supportBigNumbers: true
                });
            }
        return pool;
    }

    })();

    const executeQuery = async function (sql) {
        try {
            let dbconnection = await getPool();
            console.log(sql);
            const [articleRow] = await dbconnection.query(sql);
            return articleRow;
        }
        catch (error) {
            console.error("Error in executeQuery : ", error.message)
            throw error;
        }
    }

    module.exports = { getPool, executeQuery }