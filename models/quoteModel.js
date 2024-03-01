import mongoose from "mongoose"

const quoteSchema = mongoose.Schema(
    {
        Type: {
            type: String,
            required: true,
        },
        quote: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }
)






const Quote = mongoose.model("Quote", quoteSchema)

export default Quote
