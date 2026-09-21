using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChestSupportedMachineRows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "Category", "IsArchived", "Name", "UserId" },
                values: new object[,]
                {
                    { 171L, "Pull", false, "Chest-Supported Wide-Grip Machine Row", null },
                    { 172L, "Pull", false, "Chest-Supported Close-Grip Machine Row", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 171L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 172L);
        }
    }
}
