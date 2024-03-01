import mongoose from "mongoose"

const quoteSchema = mongoose.Schema(
    {
        type: {
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
